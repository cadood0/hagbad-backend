import { Module } from '@nestjs/common';
import { EmergencyVotesController } from './emergency-votes.controller';
import { EmergencyVotesService } from './emergency-votes.service';

@Module({
  controllers: [EmergencyVotesController],
  providers: [EmergencyVotesService]
})
export class EmergencyVotesModule {}
