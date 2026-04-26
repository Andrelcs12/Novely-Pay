import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LedgerDirection } from '../../generated/prisma/enums';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getSellerWallet(sellerId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { sellerId }
    });

    const credit = entries
      .filter(e => e.direction === LedgerDirection.CREDIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const debit = entries
      .filter(e => e.direction === LedgerDirection.DEBIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const total = credit - debit;

    // 🔥 regra simples inicial (sem hold ainda)
    const available = total;
    const pending = 0;
    const locked = 0;

    return {
      sellerId,
      available,
      pending,
      locked,
      total
    };
  }

  async getSaasWallet(saasId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { saasId }
    });

    const credit = entries
      .filter(e => e.direction === LedgerDirection.CREDIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const debit = entries
      .filter(e => e.direction === LedgerDirection.DEBIT)
      .reduce((acc, e) => acc + Number(e.amount), 0);

    const total = credit - debit;

    return {
      saasId,
      available: total,
      pending: 0,
      locked: 0,
      total
    };
  }
}