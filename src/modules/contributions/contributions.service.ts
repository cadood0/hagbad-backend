import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class ContributionsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async getCycleContributions(groupId: string, cycleId: string) {
    const cycle = await this.prisma.groupCycle.findUnique({
      where: { id: cycleId },
      select: {
        id: true,
        groupId: true,
      },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    if (cycle.groupId !== groupId) {
      throw new BadRequestException('Cycle does not belong to this group');
    }

    return this.prisma.contribution.findMany({
      where: { cycleId },
      include: {
        member: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        member: {
          rotationPosition: 'asc',
        },
      },
    });
  }

  async markPaid(
    contributionId: string,
    cycleId: string,
    groupId: string,
    adminId: string,
  ) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        cycle: true,
        member: {
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    if (contribution.cycleId !== cycleId) {
      throw new BadRequestException('Contribution does not belong to this cycle');
    }

    if (contribution.cycle.groupId !== groupId) {
      throw new BadRequestException('Contribution does not belong to this group');
    }

    if (contribution.status === 'PAID') {
      throw new BadRequestException('Contribution is already marked as paid');
    }

    const updated = await this.prisma.contribution.update({
      where: { id: contributionId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    await this.activityLog.logAction(groupId, adminId, 'CONTRIBUTION_PAID', {
      contributionId,
      cycleId,
      memberId: contribution.memberId,
      memberName: contribution.member.user.fullName,
    });

    return updated;
  }
}