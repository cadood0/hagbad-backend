import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type PayoutItem = {
  amount: number;
  groupName: string;
  periodKey: string;
  position: number;
  cyclesAway: number; // internal for sorting only
};

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private getNextPeriod(periodKey: string, offset: number): string {
    const [year, month] = periodKey.split('-').map(Number);

    const date = new Date(year, month - 1 + offset);

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`;
  }

  async getWallet(userId: string) {
    const memberships = await this.prisma.groupMembers.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              orderBy: { rotationPosition: 'asc' },
            },
            cycles: true,
          },
        },
      },
    });

    const payouts: PayoutItem[] = [];

    for (const m of memberships) {
      // ❌ Skip if already received
      if (m.hasReceived) continue;

      const group = m.group;

      const currentCycle = group.cycles.find(
        (c) => c.status === 'ACTIVE'
      );

      if (!currentCycle) continue;

      const totalMembers = group.members.length;

      const currentIndex = group.members.findIndex(
        (member) => member.id === currentCycle.payoutToMemberId
      );

      if (currentIndex === -1) continue;

      const currentPosition = currentIndex + 1;
      const myPosition = m.rotationPosition;

      let cyclesAway = myPosition - currentPosition;

      if (cyclesAway < 0) {
        cyclesAway += totalMembers;
      }

      const amount =
        group.contributionAmount * totalMembers;

      const payoutPeriod = this.getNextPeriod(
        currentCycle.periodKey,
        cyclesAway
      );

      payouts.push({
        amount,
        groupName: group.name,
        periodKey: payoutPeriod,
        position: myPosition,
        cyclesAway, // used only for sorting
      });
    }

    // SORT: nearest payout first
    payouts.sort((a, b) => {
      // first by cyclesAway
      if (a.cyclesAway !== b.cyclesAway) {
        return a.cyclesAway - b.cyclesAway;
      }

      // then by position
      return a.position - b.position;
    });

    // CALCULATE TOTAL
    const totalUpcomingPayout = payouts.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    //  REMOVE INTERNAL FIELD
    const cleanPayouts = payouts.map((p) => ({
      amount: p.amount,
      groupName: p.groupName,
      periodKey: p.periodKey,
      position: p.position,
    }));

    return {
      totalUpcomingPayout,
      payouts: cleanPayouts,
    };
  }
}