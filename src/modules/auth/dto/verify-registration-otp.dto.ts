import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class VerifyRegistrationOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number format invalid' })
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otpCode!: string;
}
