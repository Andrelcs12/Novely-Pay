// src/modules/subscription/dto/create-subscription-card.dto.ts

import {
  IsString,
  IsNumber,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  ValidateIf
} from 'class-validator';
import { SubscriptionCycle } from '../../../generated/prisma/enums';

export class CreateSubscriptionCardDto {
  @IsString()
  @IsNotEmpty()
  sellerId!: string;

  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @IsString()
  @IsNotEmpty()
  cycle!: SubscriptionCycle;

  @IsISO8601()
  @IsNotEmpty()
  nextDueDate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // 🔥 CONTROLE DE DURAÇÃO
  @IsOptional()
  @IsNumber()
  maxPayments?: number;

  // 🔐 TOKEN (produção)
  @IsOptional()
  @IsString()
  creditCardToken?: string;

  // 🔴 fallback (dev)
  @ValidateIf(o => !o.creditCardToken)
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };

  @ValidateIf(o => !o.creditCardToken)
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
    mobilePhone?: string;
  };

  @IsString()
  @IsNotEmpty()
  remoteIp!: string;
}