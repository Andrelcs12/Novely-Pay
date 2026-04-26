// src/modules/split/split.controller.ts

import { Controller, Post, Body } from '@nestjs/common';
import { SplitEngineService, CreateChargeWithSplitDto } from './split-engine.service';

@Controller('split')
export class SplitController {
  constructor(private readonly service: SplitEngineService) {}

  // POST /split/charge
  // Cria uma cobrança no Asaas com split embutido e registra a Reservation
  @Post('charge')
  async createCharge(@Body() dto: CreateChargeWithSplitDto) {
    return this.service.createChargeWithSplit(dto);
  }
}