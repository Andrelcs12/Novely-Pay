// src/modules/ledger/ledger.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateLedgerEntryDto } from './dto/ledger.dto';
import { LedgerDirection } from '../../generated/prisma/enums';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  // ➕ cria entrada manual (somente sistema interno)
  async create(dto: CreateLedgerEntryDto) {
    return this.prisma.ledgerEntry.create({
      data: {
        saasId: dto.saasId,
        sellerId: dto.sellerId,
        subscriptionId: dto.subscriptionId,
        paymentId: dto.paymentId,
        type: dto.type,
        direction: dto.direction,
        amount: dto.amount,
        description: dto.description
      }
    });
  }

  // 📊 saldo SaaS
  async getBalanceBySaas(saasId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { saasId }
    });

    const credit = entries
      .filter(e => e.direction === LedgerDirection.CREDIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const debit = entries
      .filter(e => e.direction === LedgerDirection.DEBIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    return {
      saasId,
      balance: credit - debit,
      credit,
      debit
    };
  }

  // 📊 saldo seller
  async getBalanceBySeller(sellerId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { sellerId }
    });

    const credit = entries
      .filter(e => e.direction === LedgerDirection.CREDIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const debit = entries
      .filter(e => e.direction === LedgerDirection.DEBIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    return {
      sellerId,
      balance: credit - debit,
      credit,
      debit
    };
  }

  // 📜 histórico SaaS
  async findAllBySaas(saasId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { saasId },
      orderBy: { createdAt: 'desc' }
    });
  }
}