import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { EmergencyVotesService } from './emergency-votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { VoteEmergencyRequestDto } from './dto/vote-emergency-request.dto';


@Controller('/api/v1')
export class EmergencyVotesController {
    constructor(private readonly emergencyVotesService: EmergencyVotesService) {}

    @UseGuards(JwtAuthGuard)
    @Post('groups/:groupId/emergency-requests')
    createRequest(
      @Param('groupId') groupId: string,
    
      @CurrentUser() user: { userId: string },
    
      @Body() dto: CreateEmergencyRequestDto,
    ) {
      return this.emergencyVotesService.createRequest(
        groupId,
        user.userId,
        dto,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Post('emergency-requests/:id/vote')
    vote(
      @Param('id') id: string,

      @CurrentUser() user: { userId: string },

      @Body() dto: VoteEmergencyRequestDto,
    ) {
      return this.emergencyVotesService.vote(
        id,
        user.userId,
        dto,
      );
    }

}
