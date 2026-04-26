// src/modules/webhook/webhook.controller.ts

import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { WebhookService } from './webhooks.service';

@Controller('webhooks/asaas')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  // Asaas exige resposta 200 rápida — processamento é async
  @Post()
  @HttpCode(200)
  async handle(
    @Body() body: unknown,
    @Headers('asaas-access-token') token?: string
  ): Promise<{ received: boolean }> {
    // Validação do token do webhook (configure ASAAS_WEBHOOK_TOKEN no .env)
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (webhookToken && token !== webhookToken) {
      this.logger.warn('Webhook recebido com token inválido — ignorado');
      // Retorna 200 mesmo assim para o Asaas não ficar tentando reenviar
      return { received: false };
    }

    // Não aguarda — responde 200 imediatamente
    // Se quiser processamento garantido, use uma fila (Bull/BullMQ)
    this.webhookService.processarEvento(body).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro assíncrono no processamento do webhook: ${msg}`);
    });

    return { received: true };
  }
}