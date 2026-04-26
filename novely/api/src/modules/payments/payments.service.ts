// src/modules/payments/payments.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import axios from 'axios';
import { BillingType } from '../../generated/prisma/enums';

@Injectable()
export class PaymentsService {
  private readonly asaasUrl =
    process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

  constructor(private prisma: PrismaService) {}

  // 🔒 VALIDAÇÃO DE POSSE (CRÍTICO)
  private async validarSaas(subscriptionId: string, saasId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        seller: {
          saasId
        }
      }
    });

    if (!subscription) {
      throw new ForbiddenException('Acesso negado');
    }

    return subscription;
  }

  // 🔎 LISTAR POR SUBSCRIPTION (SAAS)
  async listarPorSubscription(subscriptionId: string, saasId: string) {
    await this.validarSaas(subscriptionId, saasId);

    return this.prisma.payment.findMany({
      where: { subscriptionId },
      orderBy: { dueDate: 'desc' }
    });
  }

  // 🔎 LISTAR POR SELLER (SAAS)
  async listarPorSeller(sellerId: string, saasId: string) {
    return this.prisma.payment.findMany({
      where: {
        subscription: {
          sellerId,
          seller: { saasId }
        }
      },
      include: {
        subscription: true
      },
      orderBy: { dueDate: 'desc' }
    });
  }

  // 🔎 BUSCAR POR ID (SAAS)
  async buscarPorId(id: string, saasId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        subscription: {
          seller: { saasId }
        }
      }
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return payment;
  }

  // 📊 RESUMO (SAAS)
  async resumo(subscriptionId: string, saasId: string) {
    await this.validarSaas(subscriptionId, saasId);

    const pagamentos = await this.prisma.payment.findMany({
      where: { subscriptionId }
    });

    const totalPago = pagamentos
      .filter(p => ['RECEIVED', 'CONFIRMED'].includes(p.status))
      .reduce((acc, p) => acc + Number(p.value), 0);

    const totalAtrasado = pagamentos
      .filter(p => p.status === 'OVERDUE')
      .reduce((acc, p) => acc + Number(p.value), 0);

    const proximaFatura = pagamentos
      .filter(p => p.status === 'PENDING')
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];

    return {
      totalPago,
      totalAtrasado,
      proximaFatura
    };
  }

  // 🔄 SINCRONIZAR (SAAS)
  async sincronizar(subscriptionId: string, saasId: string) {
    const subscription = await this.validarSaas(subscriptionId, saasId);

    const { data } = await axios.get(
      `${this.asaasUrl}/subscriptions/${subscription.asaasId}/payments`,
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY
        }
      }
    );

    for (const payment of data.data) {
      await this.salvarOuAtualizar(payment, subscription.id);
    }

    return { synced: true };
  }

  // 🔥 ADMIN GLOBAL → TODOS PAGAMENTOS
  async listarTodos() {
    return this.prisma.payment.findMany({
      include: {
        subscription: {
          include: {
            seller: {
              include: {
                saas: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🔥 ADMIN GLOBAL → DASHBOARD
  async dashboardGlobal() {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'RECEIVED'
      }
    });

    const totalBruto = payments.reduce(
      (acc, p) => acc + Number(p.value),
      0
    );

    const totalLiquido = payments.reduce(
      (acc, p) => acc + Number(p.netValue || 0),
      0
    );

    const totalPlataforma = totalBruto - totalLiquido;

    return {
      totalBruto,
      totalLiquido,
      totalPlataforma
    };
  }

  // 🔴 CORE FINANCEIRO
  private async salvarOuAtualizar(payment: any, subscriptionId: string) {
    await this.prisma.payment.upsert({
      where: {
        asaasPaymentId: payment.id
      },
      update: {
        status: payment.status,
        paidAt: payment.paymentDate
          ? new Date(payment.paymentDate)
          : null,
        invoiceUrl: payment.invoiceUrl || null,
        netValue: payment.netValue || null
      },
      create: {
        asaasPaymentId: payment.id,
        value: payment.value,
        netValue: payment.netValue || null,
        billingType: payment.billingType as BillingType,
        status: payment.status,
        dueDate: new Date(payment.dueDate),
        paidAt: payment.paymentDate
          ? new Date(payment.paymentDate)
          : null,
        invoiceUrl: payment.invoiceUrl || null,
        subscriptionId
      }
    });
  }
}