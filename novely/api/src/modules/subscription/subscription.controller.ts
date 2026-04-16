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
import { CreateSubscriptionDto } from './dto/subscription.dto';

@Controller('subscriptions')
@UseGuards(SaasApiKeyGuard) // Proteção global para todas as rotas deste controller
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // Criar nova assinatura (O SaaS chama isso quando vende um plano)
  @Post()
  async criar(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.criarAssinatura(dto);
  }

  // Buscar histórico de cobranças (Para pegar links de boletos ou PIX)
  @Get(':id/faturas')
  async buscarFaturas(@Param('id') id: string) {
    return this.subscriptionService.buscarHistoricoDeCobrancas(id);
  }

  // Ver o status atual direto no Asaas (Sincronização)
  @Get(':id/status')
  async verStatus(@Param('id') id: string) {
    return this.subscriptionService.consultarStatusAtualizado(id);
  }

  // Encerrar contrato (Churn ou inadimplência)
  @Delete(':id')
  async cancelar(@Param('id') id: string) {
    return this.subscriptionService.cancelarContrato(id);
  }
}