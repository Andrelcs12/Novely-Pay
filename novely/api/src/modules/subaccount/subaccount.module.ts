import { Module } from '@nestjs/common';
import { SubaccountService } from './subaccount.service';
import { SubaccountController } from './subaccount.controller';

@Module({
  controllers: [SubaccountController],
  providers: [SubaccountService],
})
export class SubaccountModule {}
