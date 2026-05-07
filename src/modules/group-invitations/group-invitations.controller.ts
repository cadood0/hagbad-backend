import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InviteMemberDto } from './dto/invite-member.dto';
import { GroupAdminGuard } from '../groups/guards/group-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GroupInvitationsService } from './group-invitations.service';

@Controller('/api/v1/group-invitations')
export class GroupInvitationsController {
    constructor(private readonly groupInvitationsService: GroupInvitationsService) {}

    @UseGuards(JwtAuthGuard, GroupAdminGuard)

    @Post('groups/:groupId/invitations')
    inviteMember(
      @Param('groupId') groupId: string,
      @CurrentUser() admin: { userId: string },
      @Body() dto: InviteMemberDto,
    ) {
      return this.groupInvitationsService.inviteMember(
        groupId,
        admin.userId,
        dto,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Get('/my')
    getMyInvitations(
      @CurrentUser() user: { userId: string },
    ) {
      return this.groupInvitationsService.getMyInvitations(
        user.userId,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:id/accept')
    acceptInvitation(
      @Param('id') id: string,
      @CurrentUser() user: { userId: string },
    ) {
      return this.groupInvitationsService.acceptInvitation(
        id,
        user.userId,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Post('/:id/decline')
    declineInvitation(
      @Param('id') id: string,
      @CurrentUser() user: { userId: string },
    ) {
      return this.groupInvitationsService.declineInvitation(
        id,
        user.userId,
      );
    }
}
