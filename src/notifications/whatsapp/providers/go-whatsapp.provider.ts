import { Injectable, HttpException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GoWhatsappProvider {
  private baseUrl = 'http://localhost:3001';

  async sendMessage(phone: string, message: string) {
    try {
      await axios.post(`${this.baseUrl}/send/message`, {
        phone,
        message,
      });
    } catch (error: any) {
      console.error('WhatsApp API error:', error?.response?.data);

      throw new HttpException(
        'Failed to send WhatsApp message',
        500,
      );
    }
  }
}