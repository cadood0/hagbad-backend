import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class CyclesService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  private getCurrentPeriodKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getDueDateFromPeriodKey(periodKey: string): Date {
    const [year, month] = periodKey.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  async createCycle(groupId: string, adminId: string, periodKey?: string) {
    const finalPeriodKey = periodKey ?? this.getCurrentPeriodKey();

    const existingCycle = await this.prisma.groupCycle.findUnique({
      where: {
        groupId_periodKey: {
          groupId,
          periodKey: finalPeriodKey,
        },
      },
    });

    if (existingCycle) {
      throw new ConflictException('A cycle for this period already exists');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: {
            rotationPosition: 'asc',
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.members.length === 0) {
      throw new BadRequestException(
        'Cannot create cycle for a group with no members',
      );
    }

    // ✅ Enforce members count = durationMonths for fixed-duration groups
    if (
      group.durationMonths !== null &&
      group.durationMonths !== undefined &&
      group.members.length !== group.durationMonths
    ) {
      throw new BadRequestException(
        `This group requires exactly ${group.durationMonths} members before starting cycles`,
      );
    }

    const nextPayoutMember = group.members.find(
      (member) => member.hasReceived === false,
    );

    if (!nextPayoutMember) {
      throw new BadRequestException(
        'All members have already received a payout',
      );
    }

    const dueDate = this.getDueDateFromPeriodKey(finalPeriodKey);

    const result = await this.prisma.$transaction(async (prisma) => {
      const cycle = await prisma.groupCycle.create({
        data: {
          groupId,
          periodKey: finalPeriodKey,
          dueDate,
          status: 'ACTIVE',
          payoutToMemberId: nextPayoutMember.id,
        },
      });

      const contributionsData = group.members.map((member) => ({
        cycleId: cycle.id,
        memberId: member.id,
        amount: group.contributionAmount,
        status: 'UNPAID' as const,
      }));

      await prisma.contribution.createMany({
        data: contributionsData,
      });

      return cycle;
    });

    await this.activityLog.logAction(groupId, adminId, 'CYCLE_CREATED', {
      periodKey: finalPeriodKey,
      payoutToMemberId: nextPayoutMember.id,
    });

    return result;
  }

  async confirmPayoutAndCloseCycle(
    cycleId: string,
    groupId: string,
    adminId: string,
  ) {
    const cycle = await this.prisma.groupCycle.findUnique({
      where: { id: cycleId },
      include: { contributions: true },
    });

    if (!cycle) {
      throw new NotFoundException('Cycle not found');
    }

    if (cycle.groupId !== groupId) {
      throw new BadRequestException('Cycle does not belong to this group');
    }

    if (cycle.status === 'CLOSED') {
      throw new BadRequestException('Cycle is already closed');
    }

    const unpaidExists = cycle.contributions.some(
      (contribution) => contribution.status === 'UNPAID',
    );

    if (unpaidExists) {
      throw new BadRequestException(
        'Cannot payout: not all members have paid',
      );
    }

    if (!cycle.payoutToMemberId) {
      throw new BadRequestException('No payout member assigned for this cycle');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.groupMembers.update({
        where: { id: cycle.payoutToMemberId! },
        data: {
          hasReceived: true,
        },
      });

      await prisma.groupCycle.update({
        where: { id: cycleId },
        data: {
          status: 'CLOSED',
          payoutConfirmedAt: new Date(),
        },
      });
    });

    await this.activityLog.logAction(groupId, adminId, 'PAYOUT_CONFIRMED', {
      cycleId,
      payoutMemberId: cycle.payoutToMemberId,
    });

    // ✅ STEP 1 — GET UPDATED GROUP
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: {
            rotationPosition: 'asc',
          },
        },
        cycles: true,
      },
    });
    
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    
    // ✅ STEP 2 — CHECK IF ALL MEMBERS FINISHED
    const allReceived = group.members.every(m => m.hasReceived === true);
    
    if (allReceived) {
      // 🔁 OPTIONAL: reset rotation (new round)
      await this.prisma.groupMembers.updateMany({
        where: { groupId },
        data: { hasReceived: false },
      });
    }
    
    
    // ✅ STEP 3 — GENERATE NEXT PERIOD KEY
    const lastCycle = group.cycles
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
      .at(-1);
    
    let nextPeriodKey: string;
    
    if (lastCycle) {
      const [year, month] = lastCycle.periodKey.split('-').map(Number);
    
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
    
      nextPeriodKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    } else {
      nextPeriodKey = this.getCurrentPeriodKey();
    }
    
    
    // ✅ STEP 4 — CREATE NEXT CYCLE
    try {
      await this.createCycle(groupId, adminId, nextPeriodKey);
    } catch (e) {
      // Ignore duplicate cycle error
    }

    return {
      message: 'Payout confirmed and cycle closed successfully',
      payoutMemberId: cycle.payoutToMemberId,
    };
  }
}