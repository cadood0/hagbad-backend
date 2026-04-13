import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CyclesService } from './cycles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupAdminGuard } from '../groups/guards/group-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCycleDto } from './dto/create-cycle.dto';

@UseGuards(JwtAuthGuard, GroupAdminGuard)
@Controller('groups/:groupId/cycles')
export class CyclesController {
  constructor(private readonly cyclesService: CyclesService) {}

  @Post()
  createCycle(
    @Param('groupId') groupId: string,
    @CurrentUser() admin: { userId: string },
    @Body() dto: CreateCycleDto,
  ) {
    return this.cyclesService.createCycle(groupId, admin.userId, dto.periodKey);
  }

  @Post(':cycleId/payout')
  confirmPayout(
    @Param('groupId') groupId: string,
    @Param('cycleId') cycleId: string,
    @CurrentUser() admin: { userId: string },
  ) {
    return this.cyclesService.confirmPayoutAndCloseCycle(
      cycleId,
      groupId,
      admin.userId,
    );
  }
}