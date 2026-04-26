import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum LedgerType {
  PAYMENT = 'PAYMENT',
  COMMISSION = 'COMMISSION',
  SPLIT = 'SPLIT',
  REFUND = 'REFUND',
  CASHOUT = 'CASHOUT'
}

export enum LedgerDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export class CreateLedgerEntryDto {
  @IsOptional()
  @IsString()
  saasId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsEnum(LedgerType)
  type!: LedgerType;

  @IsEnum(LedgerDirection)
  direction!: LedgerDirection;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}