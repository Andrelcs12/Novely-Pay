// src/modules/ledger/ledger-writer.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { LedgerType, LedgerDirection } from '../../generated/prisma/enums';

@Injectable()
export class LedgerWriterService {
  constructor(private prisma: PrismaService) {}

  async writeEntry(data: {
    saasId?: string;
    sellerId?: string;
    subscriptionId?: string;
    paymentId?: string;
    type: LedgerType;
    direction: LedgerDirection;
    amount: number;
    description?: string;
  }) {
    return this.prisma.ledgerEntry.create({
      data: {
        saasId: data.saasId,
        sellerId: data.sellerId,
        subscriptionId: data.subscriptionId,
        paymentId: data.paymentId,
        type: data.type,
        direction: data.direction,
        amount: data.amount,
        description: data.description
      }
    });
  }
}