// src/modules/webhook/webhooks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  SubscriptionStatus,
  BillingType,
  LedgerType,
  LedgerDirection,
  ReservationStatus
} from '../../generated/prisma/enums';
import { LedgerWriterService } from '../ledger/ledger-writer.service';
import { Prisma } from '../../generated/prisma/client';

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  billingType: string;
  dueDate: string;
  paymentDate?: string | null;
  invoiceUrl?: string | null;
  subscription?: string | null;
  externalReference?: string | null;
}

interface AsaasWebhookEvent {
  event: string;
  payment?: AsaasPayment;
}

const CONFIRMED_EVENTS = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);
const CANCELLED_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_CHARGEBACK_REQUESTED'
]);

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerWriterService
  ) {}

  async processarEvento(body: unknown): Promise<void> {
    try {
      const event = body as AsaasWebhookEvent;
      const tipo = event?.event;
      const payment = event?.payment;

      if (!tipo || !payment?.id) {
        this.logger.warn('Webhook ignorado: payload inválido');
        return;
      }

      // ── Idempotência ──────────────────────────────────────────
      const jaProcessado = await this.prisma.webhookEvent.findFirst({
        where: { asaasId: payment.id, event: tipo }
      });

      if (jaProcessado) {
        this.logger.log(`Evento duplicado ignorado: ${tipo} | ${payment.id}`);
        return;
      }

      // ── Busca subscription + seller + saas ───────────────────
      const subscription = await this.prisma.subscription.findFirst({
        where: { asaasId: payment.subscription ?? '' },
        include: { seller: { include: { saas: true } } }
      });

      if (!subscription) {
        this.logger.warn(`Subscription não encontrada para payment ${payment.id}`);
        await this.salvarEvento(tipo, payment.id, body);
        return;
      }

      const seller = subscription.seller;
      const saas = seller?.saas;

      if (!saas) {
        this.logger.warn(`SaaS não encontrado para seller ${seller?.id}`);
        await this.salvarEvento(tipo, payment.id, body);
        return;
      }

      await this.salvarEvento(tipo, payment.id, body);

      // ── Upsert do Payment ─────────────────────────────────────
      const savedPayment = await this.prisma.payment.upsert({
        where: { asaasPaymentId: payment.id },
        update: {
          status: payment.status,
          paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
          invoiceUrl: payment.invoiceUrl ?? null,
          netValue: payment.netValue ?? null
        },
        create: {
          asaasPaymentId: payment.id,
          value: payment.value,
          netValue: payment.netValue ?? null,
          billingType: payment.billingType as BillingType,
          status: payment.status,
          dueDate: new Date(payment.dueDate),
          paidAt: payment.paymentDate ? new Date(payment.paymentDate) : null,
          invoiceUrl: payment.invoiceUrl ?? null,
          subscriptionId: subscription.id
        }
      });

      // ── Roteamento de eventos ─────────────────────────────────
      if (CONFIRMED_EVENTS.has(tipo)) {
        await this.handlePaymentConfirmed({
          payment,
          savedPaymentId: savedPayment.id,
          subscriptionId: subscription.id,
          saasId: saas.id,
          sellerId: seller.id,
          comissao: Number(saas.comissao ?? 0)
        });
        return;
      }

      if (tipo === 'PAYMENT_OVERDUE') {
        await this.atualizarStatusSubscription(subscription.id, SubscriptionStatus.OVERDUE);
        return;
      }

      if (CANCELLED_EVENTS.has(tipo)) {
        await this.handlePaymentCancelled({
          payment,
          savedPaymentId: savedPayment.id,
          subscriptionId: subscription.id,
          saasId: saas.id,
          sellerId: seller.id
        });
        return;
      }

      this.logger.log(`Evento sem handler: ${tipo}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao processar webhook: ${msg}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Pagamento confirmado → RELEASED + ledger comissão
  // ─────────────────────────────────────────────────────────────
  private async handlePaymentConfirmed(params: {
    payment: AsaasPayment;
    savedPaymentId: string;
    subscriptionId: string;
    saasId: string;
    sellerId: string;
    comissao: number;
  }): Promise<void> {
    const { payment, savedPaymentId, subscriptionId, saasId, sellerId, comissao } = params;

    await this.atualizarStatusSubscription(subscriptionId, SubscriptionStatus.ACTIVE);

    const gross        = Number(payment.value);
    const platformFee  = parseFloat(((gross * comissao) / 100).toFixed(2));
    const sellerAmount = parseFloat((gross - platformFee).toFixed(2));

    // Reservation idempotente — RELEASED direto para liberar saldo
    await this.prisma.reservation.upsert({
      where: { paymentId: savedPaymentId },
      update: {
        grossAmount: gross,
        platformFee,
        sellerAmount,
        saasAmount: sellerAmount,   // quanto o seller pode sacar
        status: ReservationStatus.RELEASED
      },
      create: {
        saasId,
        sellerId,
        subscriptionId,
        paymentId: savedPaymentId,
        grossAmount: gross,
        platformFee,
        sellerAmount,
        saasAmount: sellerAmount,   // quanto o seller pode sacar
        status: ReservationStatus.RELEASED
      }
    });

    await this.ledger.writeEntry({
      saasId,
      sellerId,
      subscriptionId,
      paymentId: savedPaymentId,
      type: LedgerType.COMMISSION,
      direction: LedgerDirection.CREDIT,
      amount: platformFee,
      description: `Comissão ${comissao}% | Payment ${payment.id}`
    });

    this.logger.log(
      `Confirmado | gross: ${gross} | fee: ${platformFee} | seller: ${sellerAmount}`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Pagamento cancelado/estornado → CANCELLED + ledger debit
  // ─────────────────────────────────────────────────────────────
  private async handlePaymentCancelled(params: {
    payment: AsaasPayment;
    savedPaymentId: string;
    subscriptionId: string;
    saasId: string;
    sellerId: string;
  }): Promise<void> {
    const { payment, savedPaymentId, subscriptionId, saasId, sellerId } = params;

    await this.atualizarStatusSubscription(subscriptionId, SubscriptionStatus.CANCELLED);

    const reservation = await this.prisma.reservation.findUnique({
      where: { paymentId: savedPaymentId }
    });

    if (
      reservation &&
      (reservation.status === ReservationStatus.PENDING ||
        reservation.status === ReservationStatus.RELEASED)
    ) {
      await this.prisma.reservation.update({
        where: { paymentId: savedPaymentId },
        data: { status: ReservationStatus.CANCELED }
      });
    }

    await this.ledger.writeEntry({
      saasId,
      sellerId,
      subscriptionId,
      paymentId: savedPaymentId,
      type: LedgerType.REFUND,
      direction: LedgerDirection.DEBIT,
      amount: Number(payment.value),
      description: `Estorno | Payment ${payment.id}`
    });

    this.logger.log(`Cancelado | ${payment.id}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Salva evento para idempotência
  // Fix: cast para Prisma.InputJsonValue resolve o erro de tipo
  // "Type 'unknown' is not assignable to type 'JsonNullClass | InputJsonValue'"
  // ─────────────────────────────────────────────────────────────
  private async salvarEvento(
    event: string,
    asaasId: string,
    payload: unknown
  ): Promise<void> {
    await this.prisma.webhookEvent.create({
      data: {
        event,
        asaasId,
        payload: payload as Prisma.InputJsonValue,
        processed: true
      }
    });
  }

  private async atualizarStatusSubscription(
    id: string,
    status: SubscriptionStatus
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { id },
      data: { status }
    });
  }
}