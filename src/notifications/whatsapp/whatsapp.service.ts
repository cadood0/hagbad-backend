import { Injectable } from '@nestjs/common';
import { GoWhatsappProvider } from './providers/go-whatsapp.provider';

@Injectable()
export class WhatsappService {
  constructor(
    private readonly provider: GoWhatsappProvider,
  ) {}

  async sendOtp(phone: string, otp: string) {
    const message = ` Your Ayuuto OTP code is: ${otp}`;

    return this.provider.sendMessage(phone, message);
  }
}