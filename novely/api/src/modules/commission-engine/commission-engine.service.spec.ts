import { Test, TestingModule } from '@nestjs/testing';
import { CommissionEngineService } from './commission-engine.service';

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommissionEngineService],
    }).compile();

    service = module.get<CommissionEngineService>(CommissionEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
