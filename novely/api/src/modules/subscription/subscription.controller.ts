// src/modules/subscription/subscription.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Param
} from '@nestjs/common';

import { SubscriptionService } from './subscription.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';

// ✔️ IMPORTS CORRETOS
import { CreateSubscriptionDto } from './dto/subscription.dto';
import { CreateSubscriptionCardDto } from './dto/CreateSubscriptionCardDto';

@Controller('subscriptions')
@UseGuards(SaasApiKeyGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ✔️ Assinatura normal (PIX / BOLETO / etc)
  @Post()
  async criar(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.criarAssinatura(dto);
  }

   @Post('credit-card')
  async criarComCartao(@Body() dto: CreateSubscriptionCardDto) {
    return this.subscriptionService.criarAssinaturaComCartao(dto);
  }

  // ✔️ Histórico de cobranças
  @Get(':id/faturas')
  async buscarFaturas(@Param('id') id: string) {
    return this.subscriptionService.buscarHistoricoDeCobrancas(id);
  }

  // ✔️ Status atualizado
  @Get(':id/status')
  async verStatus(@Param('id') id: string) {
    return this.subscriptionService.consultarStatusAtualizado(id);
  }

  // ✔️ Cancelamento
  @Delete(':id')
  async cancelar(@Param('id') id: string) {
    return this.subscriptionService.cancelarContrato(id);
  }
}