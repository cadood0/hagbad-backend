import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyVotesService } from './emergency-votes.service';

describe('EmergencyVotesService', () => {
  let service: EmergencyVotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmergencyVotesService],
    }).compile();

    service = module.get<EmergencyVotesService>(EmergencyVotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
