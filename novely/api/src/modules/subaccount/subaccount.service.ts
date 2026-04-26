// src/modules/subaccount/subaccount.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import axios from 'axios';
import { CreateSubaccountDto } from './dto/subaccount.dto';

@Injectable()
export class SubaccountService {
  private readonly asaasUrl =
    process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

  constructor(private prisma: PrismaService) {}

  async createSubaccount(dto: CreateSubaccountDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: dto.sellerId }
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const payload = {
      name: dto.name,
      email: dto.email,
      loginEmail: dto.loginEmail ?? dto.email,
      cpfCnpj: dto.cpfCnpj,
      mobilePhone: dto.mobilePhone,
      incomeValue: dto.incomeValue,
      address: dto.address,
      addressNumber: dto.addressNumber,
      complement: dto.complement,
      province: dto.province,
      postalCode: dto.postalCode
    };

    const { data } = await axios.post(
      `${this.asaasUrl}/accounts`,
      payload,
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY
        }
      }
    );

    /**
     * 📌 IMPORTANTE (ASAAS)
     * apiKey só aparece 1x
     * walletId é usado para split
     */

    return this.prisma.seller.update({
      where: { id: dto.sellerId },
      data: {
        asaasWalletId: data.walletId,
        asaasApiKey: data.apiKey
      }
    });
  }

  async getSubaccount(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        asaasWalletId: true,
        asaasApiKey: true
      }
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller;
  }
}