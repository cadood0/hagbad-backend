import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
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
                fullName: true,
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

  async addMember(groupId: string, adminId: string, dto: AddMemberDto) {
    const phone = normalizePhone(dto.phoneNumber);

    // 1) Find group first
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // 2) If durationMonths is fixed, prevent adding more members than allowed
    if (
      group.durationMonths !== null &&
      group.durationMonths !== undefined &&
      group.members.length >= group.durationMonths
    ) {
      throw new BadRequestException(
        `This group can only have ${group.durationMonths} members because durationMonths is fixed to ${group.durationMonths}`,
      );
    }

    // 3) Find the user by phone number
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber: phone },
    });

    if (!user) {
      throw new NotFoundException(
        'User with this phone number does not exist',
      );
    }

    // 4) Check if the user is already in the group
    const existingMember = await this.prisma.groupMembers.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already in this group');
    }

    // 5) Check if rotation position is already taken
    const duplicatePosition = await this.prisma.groupMembers.findUnique({
      where: {
        groupId_rotationPosition: {
          groupId,
          rotationPosition: dto.rotationPosition,
        },
      },
    });

    if (duplicatePosition) {
      throw new ConflictException('Rotation position already taken');
    }

    // 6) If durationMonths is fixed, rotation position cannot be greater than durationMonths
    if (
      group.durationMonths !== null &&
      group.durationMonths !== undefined &&
      dto.rotationPosition > group.durationMonths
    ) {
      throw new BadRequestException(
        `Rotation position cannot be greater than durationMonths (${group.durationMonths})`,
      );
    }

    // 7) Create the member
    const newMember = await this.prisma.groupMembers.create({
      data: {
        groupId,
        userId: user.id,
        role: 'MEMBER',
        rotationPosition: dto.rotationPosition,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
          },
        },
      },
    });

    // 8) Log activity
    await this.activityLog.logAction(
      groupId,
      adminId,
      'MEMBER_ADDED',
      `Added member with phone number ${phone} at rotation position ${dto.rotationPosition}`,
    );

    return newMember;
  }
}