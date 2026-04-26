import { Test, TestingModule } from '@nestjs/testing';
import { CommissionEngineController } from './commission-engine.controller';
import { CommissionEngineService } from './commission-engine.service';

describe('CommissionEngineController', () => {
  let controller: CommissionEngineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommissionEngineController],
      providers: [CommissionEngineService],
    }).compile();

    controller = module.get<CommissionEngineController>(CommissionEngineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
