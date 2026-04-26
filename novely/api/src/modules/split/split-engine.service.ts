// src/modules/split/split-engine.service.ts

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../prisma.service';
import { SplitService, SplitResult } from './split.service';
import { ReservationStatus } from '../../generated/prisma/enums';
import { extractAsaasError } from '../../common/guards/helpers/asaaar-error.helper';

export interface CreateChargeWithSplitDto {
  saasId: string;
  sellerId: string;
  customerId: string;
  grossAmount: number;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  dueDate?: string;
  creditCard?: object;
  creditCardHolderInfo?: object;
  remoteIp?: string;
  description?: string;
  externalReference?: string;
  subscriptionId?: string;
}

export interface AsaasChargeResponse {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeId?: string;
  split: Array<{ walletId: string; percentValue: number; fixedValue?: number }>;
}

@Injectable()
export class SplitEngineService {
  private readonly logger = new Logger(SplitEngineService.name);
  private readonly http: AxiosInstance;

  constructor(
    private prisma: PrismaService,
    private splitService: SplitService
  ) {
    this.http = axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3',
      headers: {
        'Content-Type': 'application/json',
        access_token: process.env.ASAAS_API_KEY
      },
      timeout: 15000
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Monta o array split para embutir na criação do charge
  // ─────────────────────────────────────────────────────────────
  async buildSplitPayload(
    saasId: string,
    sellerId: string
  ): Promise<{ split: Array<{ walletId: string; percentValue: number }> }> {
    const [saas, seller] = await Promise.all([
      this.prisma.saas.findUnique({ where: { id: saasId } }),
      this.prisma.seller.findUnique({ where: { id: sellerId } })
    ]);

    if (!saas) throw new BadRequestException('SaaS not found');
    if (!seller?.asaasWalletId) throw new BadRequestException('Seller sem walletId no Asaas');

    const saasPercent = Number(saas.comissao);
    const sellerPercent = parseFloat((100 - saasPercent).toFixed(2));

    if (sellerPercent <= 0 || saasPercent <= 0) {
      throw new BadRequestException('Percentuais de split inválidos');
    }

    return {
      split: [
        { walletId: saas.asaasId, percentValue: saasPercent },
        { walletId: seller.asaasWalletId, percentValue: sellerPercent }
      ]
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Cria o charge no Asaas com split embutido + Reservation no banco
  // ─────────────────────────────────────────────────────────────
  async createChargeWithSplit(dto: CreateChargeWithSplitDto): Promise<{
    charge: AsaasChargeResponse;
    split: SplitResult;
    reservation: any;
  }> {
    const [saas, seller] = await Promise.all([
      this.prisma.saas.findUnique({ where: { id: dto.saasId } }),
      this.prisma.seller.findUnique({ where: { id: dto.sellerId } })
    ]);

    if (!saas) throw new BadRequestException('SaaS not found');
    if (!seller?.asaasWalletId) throw new BadRequestException('Seller sem walletId no Asaas');

    const splitResult = await this.splitService.calculateSplit(dto.grossAmount, dto.saasId);
    const { split } = await this.buildSplitPayload(dto.saasId, dto.sellerId);

    const chargePayload: Record<string, unknown> = {
      customer: dto.customerId,
      billingType: dto.billingType,
      value: dto.grossAmount,
      description: dto.description ?? 'Cobrança',
      externalReference: dto.externalReference,
      split
    };

    if (dto.billingType === 'BOLETO') {
      if (!dto.dueDate) throw new BadRequestException('dueDate obrigatório para boleto');
      chargePayload['dueDate'] = dto.dueDate;
    }

    if (dto.billingType === 'CREDIT_CARD') {
      chargePayload['creditCard'] = dto.creditCard;
      chargePayload['creditCardHolderInfo'] = dto.creditCardHolderInfo;
      chargePayload['remoteIp'] = dto.remoteIp;
    }

    let asaasCharge: AsaasChargeResponse;
    try {
      const { data } = await this.http.post<AsaasChargeResponse>('/payments', chargePayload);
      asaasCharge = data;
      this.logger.log(`Charge criado no Asaas: ${asaasCharge.id}`);
    } catch (err) {
      const msg = extractAsaasError(err);
      this.logger.error(`Erro ao criar charge no Asaas: ${msg}`);
      throw new BadRequestException(`Asaas: ${msg}`);
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        saasId: dto.saasId,
        sellerId: dto.sellerId,
        subscriptionId: dto.subscriptionId ?? null,
        paymentId: asaasCharge.id,
        grossAmount: splitResult.grossAmount,
        platformFee: splitResult.platformFee,
        saasAmount: splitResult.saasAmount,
        status: ReservationStatus.PENDING
      }
    });

    return { charge: asaasCharge, split: splitResult, reservation };
  }

  // ─────────────────────────────────────────────────────────────
  // Atualiza split de cobrança ainda PENDENTE (boleto a vencer)
  // ─────────────────────────────────────────────────────────────
  async updateSplitOnPendingCharge(
    asaasPaymentId: string,
    saasId: string,
    sellerId: string
  ): Promise<unknown> {
    const { split } = await this.buildSplitPayload(saasId, sellerId);

    try {
      const { data } = await this.http.post(
        `/payments/${asaasPaymentId}/split`,
        { splits: split }
      );
      this.logger.log(`Split atualizado no Asaas: ${asaasPaymentId}`);
      return data;
    } catch (err) {
      const msg = extractAsaasError(err);
      throw new BadRequestException(`Asaas split update: ${msg}`);
    }
  }
}