import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string; // The user's phone number

  @IsNumber()
  @IsNotEmpty()
  rotationPosition: number;
}
