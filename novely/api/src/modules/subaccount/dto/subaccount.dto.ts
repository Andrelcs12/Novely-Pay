// src/modules/subaccount/dto/create-subaccount.dto.ts

import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString
} from 'class-validator';

export class CreateSubaccountDto {
  @IsString()
  sellerId!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  cpfCnpj!: string;

  @IsString()
  mobilePhone!: string;

  @IsNumber()
  incomeValue!: number;

  @IsString()
  address!: string;

  @IsString()
  addressNumber!: string;

  @IsString()
  province!: string;

  @IsString()
  postalCode!: string;

  // opcionais recomendados pelo Asaas
  @IsOptional()
  @IsString()
  loginEmail?: string;

  @IsOptional()
  @IsString()
  complement?: string;
}