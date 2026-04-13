import { Test, TestingModule } from '@nestjs/testing';
import { CyclesController } from './cycles.controller';

describe('CyclesController', () => {
  let controller: CyclesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CyclesController],
    }).compile();

    controller = module.get<CyclesController>(CyclesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
