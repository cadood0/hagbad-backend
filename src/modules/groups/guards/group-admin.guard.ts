import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: { id: string ; userId: string };
      params: Record<string, string>;
      body: { groupId?: string };
    }>();
    const user = request.user;
    const groupId = request.params.groupId || request.body.groupId;

    if (!user || !groupId) throw new ForbiddenException('Group ID is required');

    const userId = user.id || user.userId;

    console.log("USER ID:", userId);

    const member = await this.prisma.groupMembers.findFirst({
      where: { groupId: String(groupId), userId},
    });

    if (!member || member.role !== 'ADMIN') {
      throw new ForbiddenException('Only group admins can perform this action');
    }

    return true;
  }
}
