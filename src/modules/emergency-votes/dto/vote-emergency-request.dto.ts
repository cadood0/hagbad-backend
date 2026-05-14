import { IsEnum } from 'class-validator';
import { EmergencyVoteType } from 'generated/prisma/client/client';


export class VoteEmergencyRequestDto {
  @IsEnum(EmergencyVoteType)
  vote!: EmergencyVoteType;
}