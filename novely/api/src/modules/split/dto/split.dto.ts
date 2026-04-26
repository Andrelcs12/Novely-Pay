// src/modules/split/dto/create-split.dto.ts

import { IsNumber, IsString } from 'class-validator';

export class CreateSplitDto {
  @IsString()
  paymentId!: string;

  @IsString()
  sellerId!: string;

  @IsString()
  saasId!: string;

  @IsNumber()
  grossAmount!: number;
}