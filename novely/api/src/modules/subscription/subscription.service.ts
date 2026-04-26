// src/modules/subscription/subscription.service.ts

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger
} from '@nestjs/common';

import { PrismaService } from '../../prisma.service';
import axios from 'axios';

import { CreateSubscriptionDto } from './dto/subscription.dto';
import { CreateSubscriptionCardDto } from './dto/CreateSubscriptionCardDto';
import { SubscriptionStatus } from '../../generated/prisma/enums';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly asaasUrl =
    process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

  constructor(private prisma: PrismaService) {}

  // 🔒 helper global de acesso
  private ensureAccess(saasId: string, subscription: any) {
    if (saasId === 'ADMIN') return;

    if (subscription.seller.saasId !== saasId) {
      throw new BadRequestException('Acesso negado');
    }
  }

  // ✔️ ASSINATURA NORMAL
  async criarAssinatura(dto: CreateSubscriptionDto, saasId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: {
        id: dto.sellerId,
        saasId
      },
      include: { subscriptions: true }
    });

    if (!seller || !seller.asaasCustomerId) {
      throw new NotFoundException('Seller inválido ou não pertence ao SaaS');
    }

    const assinaturaAtiva = seller.subscriptions.find(s =>
      ['ACTIVE', 'PENDING'].includes(s.status)
    );

    if (assinaturaAtiva) {
      throw new BadRequestException('Já existe assinatura ativa');
    }

    try {
      const { data } = await axios.post(
        `${this.asaasUrl}/subscriptions`,
        {
          customer: seller.asaasCustomerId,
          billingType: dto.billingType,
          value: dto.value,
          nextDueDate: dto.nextDueDate,
          cycle: dto.cycle,
          description: dto.description,
          externalReference: seller.id
        },
        {
          headers: {
            access_token: process.env.ASAAS_API_KEY
          }
        }
      );

      return this.prisma.subscription.create({
        data: {
          asaasId: data.id,
          sellerId: seller.id,
          value: dto.value,
          cycle: dto.cycle,
          billingType: dto.billingType,
          description: dto.description,
          nextDueDate: new Date(`${dto.nextDueDate}T12:00:00Z`),
          status: 'PENDING',
          checkoutUrl: data.invoiceUrl || null
        }
      });
    } catch (error) {
      this.tratarErroProvedor(error, dto.sellerId);
    }
  }

  // ✔️ CARTÃO + TOKENIZAÇÃO + RECORRÊNCIA LIMITADA
  async criarAssinaturaComCartao(dto: CreateSubscriptionCardDto, saasId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: {
        id: dto.sellerId,
        saasId
      },
      include: { subscriptions: true }
    });

    if (!seller || !seller.asaasCustomerId) {
      throw new NotFoundException('Seller inválido');
    }

    const assinaturaAtiva = seller.subscriptions.find(s =>
      ['ACTIVE', 'PENDING'].includes(s.status)
    );

    if (assinaturaAtiva) {
      throw new BadRequestException('Já possui assinatura ativa');
    }

    try {
      const payload: any = {
        customer: seller.asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: dto.value,
        nextDueDate: dto.nextDueDate,
        cycle: dto.cycle,
        description: dto.description,
        externalReference: seller.id,
        remoteIp: dto.remoteIp
      };

      // 🔥 limita duração da assinatura
      if (dto.maxPayments) {
        payload.maxPayments = dto.maxPayments;
      }

      // 🔐 TOKENIZAÇÃO
      if (dto.creditCardToken) {
        payload.creditCardToken = dto.creditCardToken;
      } else {
        payload.creditCard = dto.creditCard;
        payload.creditCardHolderInfo = dto.creditCardHolderInfo;
      }

      const { data } = await axios.post(
        `${this.asaasUrl}/subscriptions`,
        payload,
        {
          headers: {
            access_token: process.env.ASAAS_API_KEY
          }
        }
      );

      return this.prisma.subscription.create({
        data: {
          asaasId: data.id,
          sellerId: seller.id,
          value: dto.value,
          cycle: dto.cycle,
          billingType: 'CREDIT_CARD',
          description: dto.description,
          nextDueDate: new Date(`${dto.nextDueDate}T12:00:00Z`),
          status: 'PENDING',
          maxPayments: dto.maxPayments || null
        }
      });
    } catch (error) {
      this.tratarErroProvedor(error, dto.sellerId);
    }
  }

  // ✔️ HISTÓRICO
  async buscarHistoricoDeCobrancas(id: string, saasId: string) {
    const assinatura = await this.validarAssinaturaLocal(id, saasId);

    try {
      const { data } = await axios.get(
        `${this.asaasUrl}/subscriptions/${assinatura.asaasId}/payments`,
        {
          headers: {
            access_token: process.env.ASAAS_API_KEY
          }
        }
      );

      return data;
    } catch (error) {
      this.tratarErroProvedor(error, id);
    }
  }

  // ✔️ CANCELAMENTO
  async cancelarContrato(id: string, saasId: string) {
    const assinatura = await this.validarAssinaturaLocal(id, saasId);

    if (assinatura.status === 'CANCELLED') {
      throw new BadRequestException('Já cancelado');
    }

    await axios.delete(
      `${this.asaasUrl}/subscriptions/${assinatura.asaasId}`,
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY
        }
      }
    );

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELLED' as SubscriptionStatus,
        endDate: new Date()
      }
    });
  }

  // ✔️ STATUS
  async consultarStatusAtualizado(id: string, saasId: string) {
    const assinatura = await this.validarAssinaturaLocal(id, saasId);

    const { data } = await axios.get(
      `${this.asaasUrl}/subscriptions/${assinatura.asaasId}`,
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY
        }
      }
    );

    const statusMap: Record<string, SubscriptionStatus> = {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'CANCELLED',
      EXPIRED: 'EXPIRED',
      OVERDUE: 'OVERDUE'
    };

    const novoStatus = statusMap[data.status] || 'PENDING';

    if (novoStatus !== assinatura.status) {
      await this.prisma.subscription.update({
        where: { id },
        data: { status: novoStatus }
      });
    }

    return {
      local: assinatura,
      provedor: data
    };
  }

  // 🔒 VALIDACAO MULTI-TENANT
  private async validarAssinaturaLocal(id: string, saasId: string) {
    const assinatura = await this.prisma.subscription.findUnique({
      where: { id },
      include: { seller: true }
    });

    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    if (saasId !== 'ADMIN' && assinatura.seller.saasId !== saasId) {
      throw new BadRequestException('Acesso negado');
    }

    return assinatura;
  }

  // 🔥 erro handler
  private tratarErroProvedor(error: any, contextId?: string) {
    const erros = error.response?.data?.errors;

    this.logger.error(
      `[ASAAS ERROR] ${contextId} -> ${JSON.stringify(erros || error.message)}`
    );

    if (erros) {
      throw new BadRequestException(erros.map(e => e.description).join(', '));
    }

    throw new InternalServerErrorException('Erro no provedor financeiro');
  }
}