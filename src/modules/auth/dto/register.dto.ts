import { IsOptional, isNotEmpty, IsString, Matches, MinLength, IsNotEmpty } from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{9,15}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  pin: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  fullName: string;
}