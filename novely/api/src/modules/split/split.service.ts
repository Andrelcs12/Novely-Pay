// src/modules/split/split.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface SplitResult {
  grossAmount: number;
  platformFee: number;
  saasAmount: number;
  sellerAmount: number;
  saasPercent: number;
}

@Injectable()
export class SplitService {
  constructor(private prisma: PrismaService) {}

  async calculateSplit(grossAmount: number, saasId: string): Promise<SplitResult> {
    const saas = await this.prisma.saas.findUnique({
      where: { id: saasId }
    });

    if (!saas) throw new BadRequestException('SaaS not found');

    const saasPercent = Number(saas.comissao); // ex: 10

    // Plataforma (Novely Pay) já está embutida na comissão do SaaS
    // O SaaS define a comissão que ele cobra do seller
    // Novely Pay cobra do SaaS via sua própria taxa (configurar separadamente)
    const platformFee = parseFloat(((grossAmount * saasPercent) / 100).toFixed(2));
    const saasAmount = platformFee; // o que vai pro SaaS/Novely
    const sellerAmount = parseFloat((grossAmount - platformFee).toFixed(2));

    return {
      grossAmount,
      platformFee,
      saasAmount,
      sellerAmount,
      saasPercent
    };
  }
}