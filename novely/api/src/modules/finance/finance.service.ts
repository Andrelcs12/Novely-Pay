import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // 🔥 DASHBOARD GLOBAL (ADMIN NOVELY PAY)
  async dashboardGlobal() {
    const payments = await this.prisma.payment.findMany({
      include: { subscription: true }
    });

    const totalRevenue = payments
      .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
      .reduce((acc, p) => acc + Number(p.value), 0);

    const overdue = payments
      .filter(p => p.status === 'OVERDUE')
      .reduce((acc, p) => acc + Number(p.value), 0);

    const mrr = await this.calcularMRR();

    return {
      totalRevenue,
      overdue,
      mrr,
      totalPayments: payments.length
    };
  }

  // 🔥 DASHBOARD POR SAAS (ISOLADO)
  async dashboardSaas(saasId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        subscription: {
          seller: {
            saasId
          }
        }
      },
      include: { subscription: true }
    });

    const totalRevenue = payments
      .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
      .reduce((acc, p) => acc + Number(p.value), 0);

    const mrr = await this.calcularMRRPorSaas(saasId);

    return {
      totalRevenue,
      mrr,
      totalPayments: payments.length
    };
  }

  // 💰 MRR GLOBAL
  private async calcularMRR() {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' }
    });

    return subscriptions.reduce((acc, sub) => {
      return acc + Number(sub.value);
    }, 0);
  }

  // 💰 MRR POR SAAS
  private async calcularMRRPorSaas(saasId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        seller: { saasId }
      }
    });

    return subscriptions.reduce((acc, sub) => {
      return acc + Number(sub.value);
    }, 0);
  }

  // 📊 CHURN RATE (base inicial)
  async churnRate(saasId?: string) {
    const where = saasId
      ? { seller: { saasId } }
      : {};

    const total = await this.prisma.subscription.count({ where });
    const cancelled = await this.prisma.subscription.count({
      where: {
        ...where,
        status: 'CANCELLED'
      }
    });

    return {
      churnRate: total === 0 ? 0 : cancelled / total
    };
  }

  // 💳 RECEITA POR PERÍODO
  async revenueByPeriod(start: Date, end: Date, saasId?: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        subscription: saasId
          ? {
              seller: { saasId }
            }
          : undefined
      }
    });

    const total = payments
      .filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED')
      .reduce((acc, p) => acc + Number(p.value), 0);

    return { total };
  }
}