// src/modules/cashout/cashout.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException
} from '@nestjs/common';
import { CashoutService, RequestCashoutDto } from './cashout.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

interface AuthRequest extends Request {
  auth: {
    type: 'ADMIN' | 'SAAS';
    saas: { id: string } | null;
    isAdmin: boolean;
  };
}

@Controller('cashout')
@UseGuards(SaasApiKeyGuard)
export class CashoutController {
  constructor(private readonly cashoutService: CashoutService) {}

  // ─────────────────────────────────────────────────────────────
  // POST /cashout
  // Body: { sellerId, amount }
  // O saasId vem do token (x-api-key), não do body — mais seguro
  // ─────────────────────────────────────────────────────────────
  @Post()
  async requestCashout(
    @Body() dto: RequestCashoutDto,
    @Req() req: AuthRequest
  ) {
    const saasId = req.auth.isAdmin
      ? dto['saasId']          // admin pode passar saasId no body
      : req.auth.saas?.id;    // saas normal usa o próprio id do token

    if (!saasId) {
      throw new BadRequestException('saasId não identificado');
    }

    return this.cashoutService.requestCashout(saasId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // GET /cashout/balance/:sellerId
  // ─────────────────────────────────────────────────────────────
  @Get('balance/:sellerId')
  async getBalance(@Param('sellerId') sellerId: string) {
    return this.cashoutService.getAvailableBalance(sellerId);
  }
}