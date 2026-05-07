import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InviteMemberDto } from './dto/invite-member.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async inviteMember(
  groupId: string,
  adminId: string,
  dto: InviteMemberDto,
) {
  // 1. find group
  const group = await this.prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: true,
    },
  });

  if (!group) {
    throw new NotFoundException('Group not found');
  }

  // 2. validate capacity
  if (
    group.durationMonths &&
    group.members.length >= group.durationMonths
  ) {
    throw new ConflictException('GROUP_FULL');
  }

  // 3. find user
  const user = await this.prisma.user.findUnique({
    where: {
      phoneNumber: dto.phoneNumber,
    },
  });

  if (!user) {
    throw new NotFoundException('USER_NOT_FOUND');
  }

  // 4. already member?
  const existingMember = await this.prisma.groupMembers.findFirst({
    where: {
      groupId,
      userId: user.id,
    },
  });

  if (existingMember) {
    throw new ConflictException('USER_ALREADY_MEMBER');
  }

  // 5. existing invitation?
  const existingInvitation =
    await this.prisma.groupInvitation.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

  if (existingInvitation) {
    throw new ConflictException('INVITATION_ALREADY_EXISTS');
  }

  // 6. create invitation
  const invitation =
    await this.prisma.groupInvitation.create({
      data: {
        groupId,
        invitedById: adminId,
        userId: user.id,
      },
    });

  return {
    message: 'INVITATION_SENT',
    invitation,
  };
}

async getMyInvitations(userId: string) {
  const invitations =
    await this.prisma.groupInvitation.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        group: {
          select: {
            id: true,
            name: true,
            contributionAmount: true,
            durationMonths: true,
          },
        },

        invitedBy: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

  return invitations.map((invitation) => ({
    id: invitation.id,

    status: invitation.status,

    createdAt: invitation.createdAt,

    group: invitation.group,

    invitedBy: {
      id: invitation.invitedBy.id,

      fullName: `${invitation.invitedBy.firstName ?? ''} ${
        invitation.invitedBy.middleName ?? ''
      } ${invitation.invitedBy.lastName ?? ''}`.trim(),

      phoneNumber: invitation.invitedBy.phoneNumber,
    },
  }));
}

async acceptInvitation(
  invitationId: string,
  userId: string,
) {
  // 1. find invitation
  const invitation =
    await this.prisma.groupInvitation.findUnique({
      where: {
        id: invitationId,
      },

      include: {
        group: {
          include: {
            members: true,
          },
        },
      },
    });

  if (!invitation) {
    throw new NotFoundException('INVITATION_NOT_FOUND');
  }

  // 2. ensure invitation belongs to current user
  if (invitation.userId !== userId) {
    throw new ForbiddenException('NOT_YOUR_INVITATION');
  }

  // 3. ensure still pending
  if (invitation.status !== 'PENDING') {
    throw new ConflictException(
      'INVITATION_ALREADY_PROCESSED',
    );
  }

  // 4. validate group capacity
  if (
    invitation.group.durationMonths &&
    invitation.group.members.length >=
      invitation.group.durationMonths
  ) {
    throw new ConflictException('GROUP_FULL');
  }

  // 5. already member?
  const existingMember =
    await this.prisma.groupMembers.findFirst({
      where: {
        groupId: invitation.groupId,
        userId,
      },
    });

  if (existingMember) {
    throw new ConflictException(
      'USER_ALREADY_MEMBER',
    );
  }

  // 6. next rotation position
  const nextRotationPosition =
    invitation.group.members.length + 1;

  // 7. transaction
  const result = await this.prisma.$transaction(
    async (prisma) => {
      // create member
      const member =
        await prisma.groupMembers.create({
          data: {
            groupId: invitation.groupId,
            userId,
            role: 'MEMBER',
            rotationPosition:
              nextRotationPosition,
          },
        });

      // update invitation
      await prisma.groupInvitation.update({
        where: {
          id: invitationId,
        },

        data: {
          status: 'ACCEPTED',
        },
      });

      return member;
    },
  );

  return {
    message: 'INVITATION_ACCEPTED',
    member: result,
  };
}

async declineInvitation(
  invitationId: string,
  userId: string,
) {
  // 1. find invitation
  const invitation =
    await this.prisma.groupInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

  if (!invitation) {
    throw new NotFoundException(
      'INVITATION_NOT_FOUND',
    );
  }

  // 2. ensure ownership
  if (invitation.userId !== userId) {
    throw new ForbiddenException(
      'NOT_YOUR_INVITATION',
    );
  }

  // 3. ensure still pending
  if (invitation.status !== 'PENDING') {
    throw new ConflictException(
      'INVITATION_ALREADY_PROCESSED',
    );
  }

  // 4. update invitation
  const updated =
    await this.prisma.groupInvitation.update({
      where: {
        id: invitationId,
      },

      data: {
        status: 'DECLINED',
      },
    });

  return {
    message: 'INVITATION_DECLINED',
    invitation: updated,
  };
}
}
