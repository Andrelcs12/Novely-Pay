// src/modules/reservation/dto/create-reservation.dto.ts

import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReservationStatus } from '../../../generated/prisma/enums';

export class CreateReservationDto {
  @IsString()
  saasId!: string;

  @IsString()
  sellerId!: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsString()
  paymentId!: string;

  @IsNumber()
  grossAmount!: number;

  @IsNumber()
  platformFee!: number;

  @IsNumber()
  sellerAmount!: number;

  @IsNumber()
  saasAmount!: number;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}