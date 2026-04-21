import { Exclude, Transform } from 'class-transformer';
import { Decimal } from '../../../generated/prisma/internal/prismaNamespace';


export class SaasEntity {
  id!: string;
  name!: string;
  slug!: string;

  // O @Transform converte o Decimal do Prisma para Number no JSON final
  @Transform(({ value }) => (value instanceof Decimal? value.toNumber() : value))
  comissao!: number | Decimal;

  isActive!: boolean;

  @Exclude()
  apiKeyHash!: string;

  @Exclude()
  asaasId!: string;

  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<SaasEntity>) {
    Object.assign(this, partial);
  }
}