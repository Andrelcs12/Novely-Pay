import { Test, TestingModule } from '@nestjs/testing';
import { SubaccountService } from './subaccount.service';

describe('SubaccountService', () => {
  let service: SubaccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubaccountService],
    }).compile();

    service = module.get<SubaccountService>(SubaccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
