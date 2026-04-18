import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { GoWhatsappProvider } from './whatsapp/providers/go-whatsapp.provider';

@Module({
  providers: [WhatsappService, GoWhatsappProvider],
  exports: [WhatsappService],
})
export class NotificationsModule {}