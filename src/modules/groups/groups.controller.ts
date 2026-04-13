import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest extends Request {
  user: {
    userId: string;
    phoneNumber?: string;
  };
}

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(@Req() req: AuthRequest, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.userId, dto);
  }

  @Get('my')
  listMyGroups(@Req() req: AuthRequest) {
    return this.groupsService.listMyGroups(req.user.userId);
  }

  @Get(':groupId')
  getGroupDashboard(
    @Param('groupId') groupId: string,
    @Req() req: AuthRequest,
  ) {
    return this.groupsService.getGroupDashboard(groupId, req.user.userId);
  }

  @Post(':groupId/members')
  addMember(
    @Param('groupId') groupId: string,
    @Req() req: AuthRequest,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, req.user.userId, dto);
  }
}