import { IsOptional, isNotEmpty, IsString, Matches, MinLength, IsNotEmpty } from "class-validator";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{9,15}$/)
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  pin!: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  middleName!: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  lastName!: string;
}