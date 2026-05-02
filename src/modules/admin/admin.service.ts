import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) {}

    async getStats() {
        const [
          totalUsers,
          verifiedUsers,
          totalGroups,
          activeCycles,
          totalPaidContributions,
        ] = await Promise.all([
          this.prisma.user.count(),
        
          this.prisma.user.count({
            where: { isPhoneVerified: true },
          }),
      
          this.prisma.group.count(),
      
          this.prisma.groupCycle.count({
            where: { status: 'ACTIVE' },
          }),
      
          this.prisma.contribution.count({
            where: { status: 'PAID' },
          }),
        ]);
    
        return {
          totalUsers,
          verifiedUsers,
          totalGroups,
          activeCycles,
          totalPaidContributions,
        };
    }
    
    async getUsers(page = 1, limit = 10) {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            isPhoneVerified: true,
            role: true,
            createdAt: true,
          },
        }),

        this.prisma.user.count(),
      ]);

      return {
        data: users.map((user) => ({
          ...user,
          fullName: `${user.firstName ?? ''} ${user.middleName ?? ''} ${user.lastName ?? ''}`.trim(),
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    async getGroups(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [groups, total] = await Promise.all([
    this.prisma.group.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        members: true,
        _count: {
          select: { members: true },
        },
      },
    }),

    this.prisma.group.count(),
  ]);

  return {
    data: groups.map((g) => ({
      id: g.id,
      name: g.name,
      contributionAmount: g.contributionAmount,
      membersCount: g._count.members,
      createdAt: g.createdAt,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

    async getGroupDetails(groupId: string) {
  const group = await this.prisma.group.findUnique({
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
              phoneNumber: true,
            },
          },
        },
        orderBy: { rotationPosition: 'asc' },
      },
      cycles: true,
    },
  });

  if (!group) {
    throw new NotFoundException('Group not found');
  }

  return {
    id: group.id,
    name: group.name,
    contributionAmount: group.contributionAmount,
    totalPool: group.contributionAmount * group.members.length,

    members: group.members.map((m) => ({
      id: m.id,
      fullName: `${m.user.firstName ?? ''} ${m.user.middleName ?? ''} ${m.user.lastName ?? ''}`.trim(),
      phoneNumber: m.user.phoneNumber,
      rotationPosition: m.rotationPosition,
      hasReceived: m.hasReceived,
    })),

    cycles: group.cycles,
  };
}

async getCycles(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [cycles, total] = await Promise.all([
    this.prisma.groupCycle.findMany({
      skip,
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        group: {
          select: {
            name: true,
            contributionAmount: true,
          },
        },
      },
    }),
    this.prisma.groupCycle.count(),
  ]);

  return {
    data: cycles.map((c) => ({
      id: c.id,
      groupName: c.group.name,
      periodKey: c.periodKey,
      status: c.status,
      dueDate: c.dueDate,
      contributionAmount: c.group.contributionAmount,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async getCycleDetails(cycleId: string) {
  const cycle = await this.prisma.groupCycle.findUnique({
    where: { id: cycleId },
    include: {
      group: true,
      contributions: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cycle) {
    throw new NotFoundException('Cycle not found');
  }

  return {
    id: cycle.id,
    groupName: cycle.group.name,
    periodKey: cycle.periodKey,
    status: cycle.status,
    dueDate: cycle.dueDate,

    contributions: cycle.contributions.map((c) => ({
      memberId: c.member.id,
      fullName: `${c.member.user.firstName ?? ''} ${c.member.user.middleName ?? ''} ${c.member.user.lastName ?? ''}`.trim(),
      phoneNumber: c.member.user.phoneNumber,
      amount: c.amount,
      status: c.status,
      paidAt: c.paidAt,
    })),

    summary: {
      totalMembers: cycle.contributions.length,
      paidCount: cycle.contributions.filter(c => c.status === 'PAID').length,
      unpaidCount: cycle.contributions.filter(c => c.status === 'UNPAID').length,
    },
  };
}

async forceCloseCycle(cycleId: string, adminId: string) {
  const cycle = await this.prisma.groupCycle.findUnique({
    where: { id: cycleId },
    include: {
      group: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!cycle) {
    throw new NotFoundException('Cycle not found');
  }

  if (cycle.status === 'CLOSED') {
    throw new ConflictException('Cycle already closed');
  }

  // 🔥 Find next payout member (by rotation)
  const nextMember = await this.prisma.groupMembers.findFirst({
    where: {
      groupId: cycle.groupId,
      hasReceived: false,
    },
    orderBy: {
      rotationPosition: 'asc',
    },
  });

  if (!nextMember) {
    throw new ConflictException('All members already received payout');
  }

  // 🔥 Force close transaction
  await this.prisma.$transaction(async (prisma) => {
    // mark member as received
    await prisma.groupMembers.update({
      where: { id: nextMember.id },
      data: { hasReceived: true },
    });

    // close cycle + assign payout
    await prisma.groupCycle.update({
      where: { id: cycleId },
      data: {
        status: 'CLOSED',
        payoutToMemberId: nextMember.id,
        payoutConfirmedAt: new Date(),
      },
    });
  });

  return {
    message: 'Cycle force closed successfully',
    payoutMemberId: nextMember.id,
  };
}
}
