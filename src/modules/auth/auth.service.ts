import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import * as crypto from 'crypto';
import { WhatsappService } from "../../notifications/whatsapp/whatsapp.service";
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private whatsapp: WhatsappService
  ) {}
  async register(dto: RegisterDto) {
  // 🔥 normalize phone (IMPORTANT: keep consistent)
  const phone = normalizePhone(dto.phoneNumber);

  const existingUser = await this.prisma.user.findUnique({
    where: { phoneNumber: phone },
  });

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

  let user;

  // ✅ CASE 1: already verified → block
  if (existingUser && existingUser.isPhoneVerified) {
    throw new ConflictException('Phone number is already registered');
  }

  // ✅ CASE 2: exists but NOT verified → resend OTP
  if (existingUser && !existingUser.isPhoneVerified) {
    user = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        otpCode,
        otpExpiresAt,
        otpUsedAt: null,
      },
    });
  } else {
    // ✅ CASE 3: new user → create
    const hashedPin = await bcrypt.hash(dto.pin, 10);

    user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phoneNumber: phone,
        pin: hashedPin,
        otpCode,
        otpExpiresAt,
        otpUsedAt: null,
        isPhoneVerified: false,
      },
    });
  }

  // 🔥 SEND OTP (SAFE MODE)
  try {
    await this.whatsapp.sendOtp(phone, otpCode);
  } catch (error) {
    console.error('OTP send failed:', error);
    // optional: don't crash user registration
  }

  return {
    message: 'OTP sent via WhatsApp. Please verify your phone number.',
    user: {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      isPhoneVerified: user.isPhoneVerified,
    },
  };
}

  async verifyRegistrationOtp(dto: VerifyRegistrationOtpDto) {
    const phone = normalizePhone(dto.phoneNumber);

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: phone },
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

    // 🔥 EXPIRED OTP → RESEND AUTOMATICALLY
  if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    const newOtp = crypto.randomInt(100000, 1000000).toString();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: newOtp,
        otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        otpUsedAt: null,
      },
    });

    await this.whatsapp.sendOtp(user.phoneNumber, newOtp);

    throw new UnauthorizedException(
      'OTP expired. A new OTP has been sent.',
    );
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
    const phone = normalizePhone(dto.phoneNumber);

    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: phone },
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