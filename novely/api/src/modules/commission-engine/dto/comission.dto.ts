import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CalculateCommissionDto {
  @IsString()
  saasId!: string;

  @IsString()
  sellerId!: string;

  @IsString()
  paymentId!: string;

  @IsNumber()
  amount!: number;

  // opcional override (teste de regra)
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @IsOptional()
  @IsNumber()
  sellerPercent?: number;
}