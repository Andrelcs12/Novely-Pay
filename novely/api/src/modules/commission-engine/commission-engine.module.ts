import { Module } from '@nestjs/common';
import { CommissionEngineService } from './commission-engine.service';
import { CommissionEngineController } from './commission-engine.controller';

@Module({
  controllers: [CommissionEngineController],
  providers: [CommissionEngineService],
})
export class CommissionEngineModule {}
