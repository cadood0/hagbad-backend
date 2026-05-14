import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEmergencyRequestDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}