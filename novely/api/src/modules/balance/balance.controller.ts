import { Controller, Get, Query } from '@nestjs/common';
import { BalanceService } from './balance.service';

@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  async getBalance(@Query('sellerId') sellerId: string) {
    return this.balanceService.getAvailableBalance(sellerId);
  }
}