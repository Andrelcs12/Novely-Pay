// src/modules/subaccount/subaccount.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards
} from '@nestjs/common';

import { SubaccountService } from './subaccount.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';
import { CreateSubaccountDto } from './dto/subaccount.dto';

@Controller('subaccounts')
@UseGuards(SaasApiKeyGuard)
export class SubaccountController {
  constructor(private readonly service: SubaccountService) {}

  // ➕ criar subconta Asaas
  @Post()
  async create(@Body() dto: CreateSubaccountDto) {
    return this.service.createSubaccount(dto);
  }

  // 🔍 buscar subconta do seller
  @Get(':sellerId')
  async get(@Param('sellerId') sellerId: string) {
    return this.service.getSubaccount(sellerId);
  }
}