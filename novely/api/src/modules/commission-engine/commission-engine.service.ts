import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LedgerWriterService } from '../ledger/ledger-writer.service';
import { LedgerType, LedgerDirection } from '../../generated/prisma/enums';

@Injectable()
export class CommissionEngineService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerWriterService
  ) {}

  async execute(dto: {
    saasId: string;
    sellerId: string;
    subscriptionId: string;
    paymentId: string;
    amount: number;
    platformFeePercent?: number;
    sellerPercent?: number;
  }) {
    // 🔥 buscar configuração do SaaS (dinâmico)
    const saas = await this.prisma.saas.findUnique({
      where: { id: dto.saasId }
    });

    if (!saas) throw new Error('SaaS não encontrado');

    // 🎯 regras padrão
    const platformFee = dto.platformFeePercent ?? Number(saas.comissao ?? 10);
    const sellerPercent = dto.sellerPercent ?? (100 - platformFee);

    const platformAmount = (dto.amount * platformFee) / 100;
    const sellerAmount = (dto.amount * sellerPercent) / 100;

    // =========================
    // 💰 1. PLATFORM REVENUE
    // =========================
    await this.ledger.writeEntry({
      saasId: dto.saasId,
      sellerId: dto.sellerId,
      subscriptionId: dto.subscriptionId,
      paymentId: dto.paymentId,
      type: LedgerType.COMMISSION,
      direction: LedgerDirection.CREDIT,
      amount: platformAmount,
      description: 'Platform fee (commission engine)'
    });

    // =========================
    // 💰 2. SELLER REVENUE
    // =========================
    await this.ledger.writeEntry({
      saasId: dto.saasId,
      sellerId: dto.sellerId,
      subscriptionId: dto.subscriptionId,
      paymentId: dto.paymentId,
      type: LedgerType.SPLIT,
      direction: LedgerDirection.CREDIT,
      amount: sellerAmount,
      description: 'Seller revenue split'
    });

    return {
      gross: dto.amount,
      platformFee,
      sellerPercent,
      platformAmount,
      sellerAmount
    };
  }
}