import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyVotesController } from './emergency-votes.controller';

describe('EmergencyVotesController', () => {
  let controller: EmergencyVotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmergencyVotesController],
    }).compile();

    controller = module.get<EmergencyVotesController>(EmergencyVotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
