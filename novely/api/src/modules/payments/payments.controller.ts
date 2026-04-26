import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  ForbiddenException
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

@Controller('payments')
@UseGuards(SaasApiKeyGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // 🔒 SAAS → pagamentos da subscription
  @Get('subscription/:id')
  async listarPorSubscription(@Param('id') id: string, @Req() req) {
    return this.service.listarPorSubscription(id, req.saas.id);
  }

  // 🔒 SAAS → pagamentos do seller
  @Get('seller/:sellerId')
  async listarPorSeller(@Param('sellerId') sellerId: string, @Req() req) {
    return this.service.listarPorSeller(sellerId, req.saas.id);
  }

  // 🔒 SAAS → pagamento individual
  @Get(':id')
  async buscarPorId(@Param('id') id: string, @Req() req) {
    return this.service.buscarPorId(id, req.saas.id);
  }

  // 🔒 SAAS → resumo
  @Get('subscription/:id/resumo')
  async resumo(@Param('id') id: string, @Req() req) {
    return this.service.resumo(id, req.saas.id);
  }

  // 🔄 sync
  @Post('sync/:subscriptionId')
  async sync(@Param('subscriptionId') subscriptionId: string, @Req() req) {
    return this.service.sincronizar(subscriptionId, req.saas.id);
  }

  // 🔥 ADMIN GLOBAL

  @Get('admin/all')
  async listarTodos(@Req() req) {
    if (!req.saas.isAdmin) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.service.listarTodos();
  }

  @Get('admin/dashboard')
  async dashboardGlobal(@Req() req) {
    if (!req.saas.isAdmin) {
      throw new ForbiddenException('Acesso negado');
    }
    return this.service.dashboardGlobal();
  }
}