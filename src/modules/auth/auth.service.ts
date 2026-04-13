import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}


  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingUser) {
      throw new ConflictException('Phone number is already registered');
    }

    const hashedPin = await bcrypt.hash(dto.pin, 10);
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        pin: hashedPin,
        otpCode,
        otpExpiresAt,
        otpUsedAt: null,
        isPhoneVerified: false,
      },
    });

    return {
      message: 'User registered successfully. Verify OTP to activate account.',
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified,
      },
      otp: otpCode, // REMOVE IN PRODUCTION
    };
  }

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isPhoneVerified) {
      throw new ConflictException('Phone number is already verified');
    }

    if (user.otpCode !== dto.otpCode) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP has expired');
    }

    if (user.otpUsedAt) {
      throw new UnauthorizedException('OTP has already been used');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpUsedAt: new Date(),
        isPhoneVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return {
      message: 'Phone number verified successfully',
    };
  }

   async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid phone number or PIN');
    }

    if (!user.isPhoneVerified) {
      throw new UnauthorizedException('Phone number is not verified');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pin!);

    if (!isPinValid) {
      throw new UnauthorizedException('Invalid phone number or PIN');
    }

    const payload = { sub: user.id, phoneNumber: user.phoneNumber };
    const token = this.jwt.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        isPhoneVerified: true,
        createdAt: true,
      },
    });
  }
}