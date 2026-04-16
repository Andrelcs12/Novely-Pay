import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SaasModule } from './modules/saas/saas.module';
import { PrismaService } from './prisma.service';
import { CustomerModule } from './modules/customer/customer.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // Configuração Global para ler o .env em todo o projeto
    ConfigModule.forRoot({ 
      isGlobal: true,
    }),
    
    SaasModule, CustomerModule, SubscriptionModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
