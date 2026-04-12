import { IsString, IsNotEmpty, IsNumber, Min, Max, Matches, IsOptional, IsBoolean } from 'class-validator';

export class CreateSaasDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do SaaS é obrigatório.' })
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'O slug deve conter apenas letras minúsculas e hífens.' })
  slug!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  comissao!: number;
}

export class UpdateSaasDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { 
    message: 'O slug deve conter apenas letras minúsculas e hífens.' 
  })
  slug?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  comissao?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}