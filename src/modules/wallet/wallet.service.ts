import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Candidate = {
  amount: number;
  groupName: string;
  periodKey: string;
  position: number;
  cyclesAway: number;
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

    let totalUpcomingPayout = 0;
    let bestCandidate: Candidate | null = null;

    for (const m of memberships) {
      // ❌ skip if already received payout
      if (m.hasReceived) continue;

      const group = m.group;

      const currentCycle = group.cycles.find(
        (c) => c.status === 'ACTIVE'
      );

      if (!currentCycle) continue;

      const totalMembers = group.members.length;

      // find current payout position
      const currentIndex = group.members.findIndex(
        (member) => member.id === currentCycle.payoutToMemberId
      );

      if (currentIndex === -1) continue;

      const currentPosition = currentIndex + 1;
      const myPosition = m.rotationPosition;

      // calculate distance
      let cyclesAway = myPosition - currentPosition;

      if (cyclesAway < 0) {
        cyclesAway += totalMembers;
      }

      // calculate payout
      const amount =
        group.contributionAmount * totalMembers;

      // calculate future period
      const payoutPeriod = this.getNextPeriod(
        currentCycle.periodKey,
        cyclesAway
      );

      // add to total (only valid upcoming)
      totalUpcomingPayout += amount;

      // 🔥 pick nearest payout
      if (
        !bestCandidate ||
        cyclesAway < bestCandidate.cyclesAway
      ) {
        bestCandidate = {
          amount,
          groupName: group.name,
          periodKey: payoutPeriod,
          position: myPosition,
          cyclesAway,
        };
      }
    }

    // build final response
    let nextPayout = null;

    if (bestCandidate) {
      nextPayout = {
        amount: bestCandidate.amount,
        groupName: bestCandidate.groupName,
        periodKey: bestCandidate.periodKey,
        position: bestCandidate.position,
      };
    }

    return {
      totalUpcomingPayout,
      nextPayout,
    };
  }
}