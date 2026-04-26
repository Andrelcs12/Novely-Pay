import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

@Controller('finance')
@UseGuards(SaasApiKeyGuard)
export class FinanceController {
  constructor(private service: FinanceService) {}

  // 🔥 ADMIN GLOBAL (NOVELY PAY)
  @Get('admin/dashboard')
  async dashboardGlobal(@Req() req) {
    if (!req.saas?.isAdmin) {
      throw new Error('Acesso negado');
    }

    return this.service.dashboardGlobal();
  }

  // 🔥 DASHBOARD SAAS
  @Get('dashboard')
  async dashboard(@Req() req) {
    return this.service.dashboardSaas(req.saas.id);
  }

  // 📊 CHURN
  @Get('churn')
  async churn(@Req() req) {
    return this.service.churnRate(req.saas.id);
  }

  // 💰 REVENUE POR PERÍODO
  @Get('revenue')
  async revenue(
    @Req() req,
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    return this.service.revenueByPeriod(
      new Date(start),
      new Date(end),
      req.saas.id
    );
  }
}