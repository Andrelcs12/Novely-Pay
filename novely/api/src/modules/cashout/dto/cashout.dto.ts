import { IsNumber, IsString } from 'class-validator';

export class CreateCashoutDto {
  @IsString()
  sellerId!: string;

  @IsNumber()
  amount!: number;
}