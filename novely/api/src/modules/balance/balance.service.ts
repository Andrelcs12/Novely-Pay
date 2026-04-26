// src/modules/balance/balance.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ReservationStatus } from '../../generated/prisma/enums';

export interface SellerBalance {
  sellerId: string;
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
}

@Injectable()
export class BalanceService {
  constructor(private prisma: PrismaService) {}

  async getAvailableBalance(sellerId: string): Promise<SellerBalance> {
    const reservations = await this.prisma.reservation.findMany({
      where: { sellerId },
      select: {
        grossAmount: true,
        platformFee: true,
        status: true,
        isConsumed: true
      }
    });

    let availableBalance = 0;
    let pendingBalance = 0;

    for (const r of reservations) {
      if (r.isConsumed) continue;

      const value =
        Number(r.grossAmount) - Number(r.platformFee);

      if (r.status === ReservationStatus.RELEASED) {
        availableBalance += value;
      }

      if (r.status === ReservationStatus.PENDING) {
        pendingBalance += value;
      }
    }

    return {
      sellerId,
      availableBalance: Number(availableBalance.toFixed(2)),
      pendingBalance: Number(pendingBalance.toFixed(2)),
      totalBalance: Number((availableBalance + pendingBalance).toFixed(2))
    };
  }
}