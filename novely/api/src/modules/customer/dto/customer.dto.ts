import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSellerCustomerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  cpfCnpj!: string;

  @IsString()
  @IsNotEmpty()
  mobilePhone!: string;
}