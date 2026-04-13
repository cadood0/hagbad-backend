import { IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phoneNumber: string;

  @IsString()
  @MinLength(4)
  pin: string;
}