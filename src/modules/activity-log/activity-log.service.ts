import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    groupId: string,
    userId: string,
    action: string,
    details?: any,
  ) {
    if (!groupId) {
      throw new BadRequestException('groupId is required for activity log');
    }

    if (!userId) {
      throw new BadRequestException('userId is required for activity log');
    }

    return this.prisma.activityLog.create({
      data: {
        groupId,
        userId,
        action,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }
}