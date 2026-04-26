// src/modules/payments/dto/payments.dto.ts

import { IsString, IsOptional } from 'class-validator';

export class GetPaymentsBySubscriptionDto {
  @IsString()
  subscriptionId!: string;
}

export class GetPaymentsBySellerDto {
  @IsString()
  sellerId!: string;
}

export class SyncPaymentsDto {
  @IsString()
  subscriptionId!: string;
}