import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmergencyRequestDto } from './dto/create-emergency-request.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoteEmergencyRequestDto } from './dto/vote-emergency-request.dto';

@Injectable()
export class EmergencyVotesService {

    constructor(private readonly prisma: PrismaService) {}

async createRequest(
  groupId: string,
  userId: string,
  dto: CreateEmergencyRequestDto,
) {
  // 1. find membership
  const member =
    await this.prisma.groupMembers.findFirst({
      where: {
        groupId,
        userId,
      },
    });

  if (!member) {
    throw new ForbiddenException(
      'NOT_GROUP_MEMBER',
    );
  }

  // 2. existing pending request?
  const existing =
    await this.prisma.emergencyRequest.findFirst({
      where: {
        groupId,
        requesterId: member.id,
        status: 'PENDING',
      },
    });

  if (existing) {
    throw new ConflictException(
      'PENDING_REQUEST_ALREADY_EXISTS',
    );
  }

  // 3. create request
  const request =
    await this.prisma.emergencyRequest.create({
      data: {
        groupId,
        requesterId: member.id,
        reason: dto.reason,
      },
    });

  return {
    message: 'EMERGENCY_REQUEST_CREATED',
    request,
  };
}


async vote(
  requestId: string,
  userId: string,
  dto: VoteEmergencyRequestDto,
) {
  // 1. find request
  const request =
    await this.prisma.emergencyRequest.findUnique({
      where: {
        id: requestId,
      },

      include: {
        group: {
          include: {
            members: true,
            cycles: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },

        votes: true,
      },
    });

  if (!request) {
    throw new NotFoundException(
      'REQUEST_NOT_FOUND',
    );
  }

  // 2. request already processed?
  if (request.status !== 'PENDING') {
    throw new ConflictException(
      'REQUEST_ALREADY_PROCESSED',
    );
  }

  // 3. find voter membership
  const member =
    await this.prisma.groupMembers.findFirst({
      where: {
        groupId: request.groupId,
        userId,
      },
    });

  if (!member) {
    throw new ForbiddenException(
      'NOT_GROUP_MEMBER',
    );
  }

  // 4. requester cannot vote
  if (member.id === request.requesterId) {
    throw new ConflictException(
      'REQUESTER_CANNOT_VOTE',
    );
  }

  // 5. already voted?
  const existingVote =
    await this.prisma.emergencyVote.findUnique({
      where: {
        requestId_memberId: {
          requestId,
          memberId: member.id,
        },
      },
    });

  if (existingVote) {
    throw new ConflictException(
      'ALREADY_VOTED',
    );
  }

  // 6. create vote
  await this.prisma.emergencyVote.create({
    data: {
      requestId,
      memberId: member.id,
      vote: dto.vote,
    },
  });

  // 7. count votes
  const votes =
    await this.prisma.emergencyVote.findMany({
      where: {
        requestId,
      },
    });

  const yesVotes = votes.filter(
    (v) => v.vote === 'YES',
  ).length;

  const noVotes = votes.filter(
    (v) => v.vote === 'NO',
  ).length;

  const totalMembers =
    request.group.members.length;

  // majority threshold
  const requiredVotes =
    Math.floor(totalMembers / 2) + 1;

  // 8. APPROVE REQUEST
  if (yesVotes >= requiredVotes) {
    const activeCycle =
      request.group.cycles[0];

    if (!activeCycle) {
      throw new ConflictException(
        'NO_ACTIVE_CYCLE',
      );
    }

    await this.prisma.$transaction(
      async (prisma) => {
        // approve request
        await prisma.emergencyRequest.update({
          where: {
            id: requestId,
          },

          data: {
            status: 'APPROVED',
          },
        });

        // override payout receiver
        await prisma.groupCycle.update({
          where: {
            id: activeCycle.id,
          },

          data: {
            payoutToMemberId:
              request.requesterId,
          },
        });
      },
    );

    return {
      message: 'REQUEST_APPROVED',
    };
  }

  // 9. REJECT REQUEST
  if (noVotes >= requiredVotes) {
    await this.prisma.emergencyRequest.update({
      where: {
        id: requestId,
      },

      data: {
        status: 'REJECTED',
      },
    });

    return {
      message: 'REQUEST_REJECTED',
    };
  }

  // 10. still pending
  return {
    message: 'VOTE_RECORDED',

    votes: {
      yesVotes,
      noVotes,
      requiredVotes,
    },
  };
}
}

