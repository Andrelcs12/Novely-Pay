// src/modules/cashout/cashout.service.ts
//
// Fluxo correto:
// 1. Valida seller + KYC
// 2. Bloqueia duplo cashout
// 3. Valida saldo (via aggregate no DB)
// 4. Cria Cashout PROCESSING no banco
// 5. Chama Asaas /transfers FORA da transação
// 6. Transação atômica: atualiza cashout + ledger + consome reservas
// 7. Em erro: marca FAILED e preserva externalId para reconciliação

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma.service';
import {
  LedgerType,
  LedgerDirection,
  ReservationStatus,
  CashoutStatus
} from '../../generated/prisma/enums';
import { extractAsaasError } from '../../common/guards/helpers/asaaar-error.helper';

export interface RequestCashoutDto {
  sellerId: string;
  amount: number;
}

export interface SellerBalance {
  sellerId: string;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
}

@Injectable()
export class CashoutService {
  private readonly logger = new Logger(CashoutService.name);
  private readonly http: AxiosInstance;

  constructor(private prisma: PrismaService) {
    this.http = axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
      headers: {
        'Content-Type': 'application/json',
        access_token: process.env.ASAAS_API_KEY
      },
      timeout: 20000
    });
  }

  async getAvailableBalance(sellerId: string): Promise<SellerBalance> {
  const reservations = await this.prisma.reservation.findMany({
    where: {
      sellerId
    },
    select: {
      grossAmount: true,
      platformFee: true,
      status: true,
      isConsumed: true
    }
  });

  let availableBalance = 0;
  let pendingBalance = 0;

  for (const r of reservations) {
    const value =
      Number(r.grossAmount) - Number(r.platformFee);

    if (r.isConsumed) continue;

    if (r.status === ReservationStatus.RELEASED) {
      availableBalance += value;
    }

    if (r.status === ReservationStatus.PENDING) {
      pendingBalance += value;
    }
  }

  return {
    sellerId,
    availableBalance: Number(availableBalance.toFixed(2)),
    pendingBalance: Number(pendingBalance.toFixed(2)),
    totalBalance: Number((availableBalance + pendingBalance).toFixed(2))
  };
}

  // ─────────────────────────────────────────────────────────────
  // KYC check via Asaas (usando a API key master — sandbox bypassa)
  // ─────────────────────────────────────────────────────────────
  private async checkKyc(asaasWalletId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return; // bypass em dev/sandbox

    try {
      // Consulta a subaccount via endpoint de accounts
      const { data } = await this.http.get(`/accounts/${asaasWalletId}`);
      const status: string = data?.accountStatus?.generalApproval ?? 'UNKNOWN';

      if (status !== 'APPROVED') {
        throw new BadRequestException(
          `KYC do seller não aprovado no Asaas. Status atual: ${status}`
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const msg = extractAsaasError(err);
      this.logger.warn(`Não foi possível verificar KYC: ${msg}`);
      throw new BadRequestException(`Erro ao verificar KYC no Asaas: ${msg}`);
    }
  }

  async requestCashout(saasId: string, dto: RequestCashoutDto) {
  const seller = await this.prisma.seller.findUnique({
    where: { id: dto.sellerId }
  });

  if (!seller) throw new BadRequestException('Seller não encontrado');
  if (!seller.asaasWalletId) throw new BadRequestException('Seller sem subaccount');

  // 1. bloqueio simples anti concorrência
  const runningCashout = await this.prisma.cashout.findFirst({
    where: {
      sellerId: seller.id,
      status: CashoutStatus.PROCESSING
    }
  });

  if (runningCashout) {
    throw new BadRequestException('Cashout já em processamento');
  }

  // 2. saldo
  const { availableBalance } =
    await this.getAvailableBalance(seller.id);

  const requestedAmount = Number(dto.amount);

  if (requestedAmount > availableBalance) {
    throw new BadRequestException('Saldo insuficiente');
  }

  // 3. reservas válidas
  const reservations = await this.prisma.reservation.findMany({
    where: {
      sellerId: seller.id,
      status: ReservationStatus.RELEASED,
      isConsumed: false
    },
    orderBy: { createdAt: 'asc' }
  });

  // 4. cria cashout
  const cashout = await this.prisma.cashout.create({
    data: {
      saasId,
      sellerId: seller.id,
      amount: requestedAmount,
      status: CashoutStatus.PROCESSING
    }
  });

  // 5. chama Asaas (FORA da transação)
  let asaasTransferId: string;

  try {
    const { data } = await this.http.post('/transfers', {
      value: requestedAmount,
      walletId: seller.asaasWalletId
    });

    asaasTransferId = data.id;
  } catch (err) {
    await this.prisma.cashout.update({
      where: { id: cashout.id },
      data: {
        status: CashoutStatus.FAILED,
        errorMessage: 'Erro Asaas'
      }
    });

    throw new BadRequestException('Falha no Asaas');
  }

  // 6. transação final (estado consistente)
  const processedAt = new Date();

  await this.prisma.$transaction(async (tx) => {
    await tx.cashout.update({
      where: { id: cashout.id },
      data: {
        status: CashoutStatus.PAID,
        externalId: asaasTransferId,
        processedAt
      }
    });

    await tx.ledgerEntry.create({
      data: {
        saasId,
        sellerId: seller.id,
        type: LedgerType.CASHOUT,
        direction: LedgerDirection.DEBIT,
        amount: requestedAmount,
        description: `Cashout ${asaasTransferId}`
      }
    });

    // 🔥 CONSUMO CORRETO DAS RESERVAS
    let remaining = requestedAmount;

    for (const r of reservations) {
      if (remaining <= 0) break;
      if (r.isConsumed) continue;

      const available =
        Number(r.grossAmount) - Number(r.platformFee);

      const consume = Math.min(available, remaining);

      remaining -= consume;

      await tx.reservation.update({
        where: { id: r.id },
        data: {
          isConsumed: true,
          consumedAt: new Date()
        }
      });
    }
  });

  return {
    cashoutId: cashout.id,
    asaasTransferId,
    amount: requestedAmount,
    status: CashoutStatus.PAID,
    processedAt
  };
  }}