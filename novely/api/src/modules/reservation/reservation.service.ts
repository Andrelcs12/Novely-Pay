// src/modules/reservation/reservation.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationStatus } from '../../generated/prisma/enums';

@Injectable()
export class ReservationService {
  constructor(private prisma: PrismaService) {}

  // ➕ criar reserva (USADO PELO SPLIT ENGINE / WEBHOOK)
  async create(dto: CreateReservationDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.prisma.reservation.create({
      data: {
        saasId: dto.saasId,
        sellerId: dto.sellerId,
        subscriptionId: dto.subscriptionId,
        paymentId: dto.paymentId,

        grossAmount: dto.grossAmount,
        platformFee: dto.platformFee,
        sellerAmount: dto.sellerAmount,
        saasAmount: dto.saasAmount,

        status: ReservationStatus.PENDING
      }
    });
  }

  // 📋 por seller
  async findBySeller(sellerId: string) {
    return this.prisma.reservation.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 📋 por SaaS
  async findBySaas(saasId: string) {
    return this.prisma.reservation.findMany({
      where: { saasId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🔄 atualizar status financeiro
  async updateStatus(id: string, dto: UpdateReservationDto) {
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: dto.status
      }
    });
  }

  // ❌ cancelar reserva
  async cancel(id: string) {
    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELED
      }
    });
  }

  // 🔍 buscar por payment (muito usado no webhook)
  async findByPayment(paymentId: string) {
    return this.prisma.reservation.findUnique({
      where: { paymentId }
    });
  }
}