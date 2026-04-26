import { Controller, Post, Body, Req, ForbiddenException, UseGuards } from '@nestjs/common';
import { CommissionEngineService } from './commission-engine.service';
import { SaasApiKeyGuard } from '../../common/guards/saas.guard';
import { CalculateCommissionDto } from './dto/comission.dto';

@Controller('commission-engine')
@UseGuards(SaasApiKeyGuard)
export class CommissionEngineController {
  constructor(private service: CommissionEngineService) {}

  @Post('calculate')
  async calculate(@Body() dto: CalculateCommissionDto, @Req() req) {
    // 🔒 só admin ou backend interno
    if (!req.saas.isAdmin) {
      throw new ForbiddenException('Apenas sistema pode executar comissão');
    }

    return this.service.execute({
      ...dto,
      subscriptionId: dto.paymentId // (placeholder se quiser ajustar depois)
    });
  }
}