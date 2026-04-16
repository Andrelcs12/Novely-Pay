import { Module } from '@nestjs/common';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SaasController],
  providers: [SaasService, PrismaService],
})
export class SaasModule {}
