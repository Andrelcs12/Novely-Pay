import { Controller, Get, Param, Post, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { CreateLedgerEntryDto } from './dto/ledger.dto';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

@Controller('ledger')
@UseGuards(SaasApiKeyGuard)
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  // 🔒 criar entrada (SOMENTE BACKEND INTERNO / WEBHOOKS)
  @Post()
  create(@Body() dto: CreateLedgerEntryDto, @Req() req) {
    if (!req.saas.isAdmin) {
      throw new ForbiddenException('Somente sistema pode criar ledger diretamente');
    }

    return this.service.create(dto);
  }

  // 🔒 SaaS balance
  @Get('saas/:saasId/balance')
  getBalanceSaas(@Param('saasId') saasId: string, @Req() req) {
    if (!req.saas.isAdmin && req.saas.id !== saasId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.service.getBalanceBySaas(saasId);
  }

  // 🔒 Seller balance
  @Get('seller/:sellerId/balance')
  getBalanceSeller(@Param('sellerId') sellerId: string, @Req() req) {
    if (!req.saas.isAdmin && req.saas.id !== sellerId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.service.getBalanceBySeller(sellerId);
  }

  // 🔒 histórico SaaS
  @Get('saas/:saasId')
  findAll(@Param('saasId') saasId: string, @Req() req) {
    if (!req.saas.isAdmin && req.saas.id !== saasId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.service.findAllBySaas(saasId);
  }
}