import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SaasModule } from './modules/saas/saas.module';
import { PrismaService } from './prisma.service';
import { CustomerModule } from './modules/customer/customer.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ConfigModule } from '@nestjs/config';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinanceModule } from './modules/finance/finance.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { CommissionEngineModule } from './modules/commission-engine/commission-engine.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReservationModule } from './modules/reservation/reservation.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { BalanceModule } from './modules/balance/balance.module';
import { CashoutModule } from './modules/cashout/cashout.module';
import { SucaccountModule } from './modules/sucaccount/sucaccount.module';
import { SubaccountModule } from './modules/subaccount/subaccount.module';
import { SplitModule } from './modules/split/split.module';
import { ReservationModule } from './modules/reservation/reservation.module';

@Module({
  imports: [
    // Configuração Global para ler o .env em todo o projeto
    ConfigModule.forRoot({ 
      isGlobal: true,
    }),
    
    SaasModule, CustomerModule, SubscriptionModule, WebhooksModule, PaymentsModule, FinanceModule, LedgerModule, CommissionEngineModule, WalletModule, ReservationModule, SucaccountModule, SubaccountModule, SplitModule, CashoutModule, BalanceModule, SellersModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
