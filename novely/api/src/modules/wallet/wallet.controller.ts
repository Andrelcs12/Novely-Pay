import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException
} from '@nestjs/common';

import { WalletService } from './wallet.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

@Controller('wallet')
@UseGuards(SaasApiKeyGuard)
export class WalletController {
  constructor(private service: WalletService) {}

  // 💰 wallet seller
  @Get('seller/:sellerId')
  async getSellerWallet(@Param('sellerId') sellerId: string, @Req() req) {
    if (!req.saas.isAdmin && req.saas.id !== sellerId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.service.getSellerWallet(sellerId);
  }

  // 🏢 wallet saas
  @Get('saas/:saasId')
  async getSaasWallet(@Param('saasId') saasId: string, @Req() req) {
    if (!req.saas.isAdmin && req.saas.id !== saasId) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.service.getSaasWallet(saasId);
  }
}