import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SaasModule } from './modules/saas/saas.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [SaasModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
