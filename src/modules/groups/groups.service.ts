import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { normalizePhone } from 'src/common/utils/phone.util';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    const result = await this.prisma.$transaction(async (prisma) => {
      const group = await prisma.group.create({
        data: {
          name: dto.name,
          description: dto.description,
          contributionAmount: dto.contributionAmount,
          durationMonths: dto.durationMonths,
          createdById: userId,
        },
      });

      await prisma.groupMembers.create({
        data: {
          groupId: group.id,
          userId,
          role: 'ADMIN',
          rotationPosition: 1,
        },
      });

      return group;
    });

    await this.activityLog.logAction(result.id, userId, 'GROUP_CREATED');
    return result;
  }

  async listMyGroups(userId: string) {
    return this.prisma.groupMembers.findMany({
      where: { userId },
      include: { group: true },
    });
  }

  async getGroupDashboard(groupId: string, userId: string) {
    const membership = await this.prisma.groupMembers.findFirst({
      where: { groupId, userId },
    });

    if (!membership) {
      throw new NotFoundException('Group not found or access denied');
    }

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
          orderBy: { rotationPosition: 'asc' },
        },
        cycles: {
          orderBy: {
            dueDate: 'desc',
          },
          take: 1,
        },
      },
    });
  }
}