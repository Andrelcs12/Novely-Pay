// src/modules/reservation/reservation.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch
} from '@nestjs/common';

import { ReservationService } from './reservation.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  // ➕ criar reserva (geralmente usado pelo split/webhook)
  @Post()
  async create(@Body() dto: CreateReservationDto) {
    return this.service.create(dto);
  }

  // 📋 seller
  @Get('seller/:sellerId')
  async bySeller(@Param('sellerId') sellerId: string) {
    return this.service.findBySeller(sellerId);
  }

  // 📋 saas
  @Get('saas/:saasId')
  async bySaas(@Param('saasId') saasId: string) {
    return this.service.findBySaas(saasId);
  }

  // 🔄 status update
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto
  ) {
    return this.service.updateStatus(id, dto);
  }

  // ❌ cancel
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}