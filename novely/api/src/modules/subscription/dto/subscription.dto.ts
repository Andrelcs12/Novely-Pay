import { IsEnum, IsNotEmpty, IsNumber, IsString, IsISO8601, IsOptional, MaxLength } from 'class-validator';
import { BillingType, SubscriptionCycle } from '../../../generated/prisma/enums';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  sellerId!: string;

  @IsNumber()
  @IsNotEmpty()
  value!: number;

  @IsEnum(SubscriptionCycle)
  @IsNotEmpty()
  cycle!: SubscriptionCycle;

  @IsEnum(BillingType)
  @IsNotEmpty()
  billingType!: BillingType;

  @IsISO8601()
  @IsNotEmpty()
  nextDueDate!: string; // Formato YYYY-MM-DD

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}