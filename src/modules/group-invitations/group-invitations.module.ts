import { Module } from '@nestjs/common';
import { GroupInvitationsController } from './group-invitations.controller';
import { GroupInvitationsService } from './group-invitations.service';

@Module({
  controllers: [GroupInvitationsController],
  providers: [GroupInvitationsService]
})
export class GroupInvitationsModule {}
