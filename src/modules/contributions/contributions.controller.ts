import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupAdminGuard } from '../groups/guards/group-admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/cycles/:cycleId/contributions')
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Get()
  getContributions(
    @Param('groupId') groupId: string,
    @Param('cycleId') cycleId: string,
  ) {
    return this.contributionsService.getCycleContributions(groupId, cycleId);
  }

  @UseGuards(GroupAdminGuard)
  @Post(':contributionId/pay')
  markPaid(
    @Param('groupId') groupId: string,
    @Param('cycleId') cycleId: string,
    @Param('contributionId') contributionId: string,
    @CurrentUser() admin: { userId: string },
  ) {
    return this.contributionsService.markPaid(
      contributionId,
      cycleId,
      groupId,
      admin.userId,
    );
  }
}