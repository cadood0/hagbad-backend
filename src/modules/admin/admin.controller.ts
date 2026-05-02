import { Controller, Get, Post, Query, Param, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guard/admin.guard';


@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('test')
  test() {
    return { message: 'Admin route working 🔥' };
  }

  @Post('cycles/:id/force-close')
    forceCloseCycle(
      @Param('id') id: string,
      @Req() req: any,
    ) {
      return this.adminService.forceCloseCycle(id, req.user.userId);
    }
    
  @Get('stats')
    getStats() {
      return this.adminService.getStats();
    }

    @Get('users')
        getUsers(
        @Query('page') page: string,
        @Query('limit') limit: string,
      ) {
        return this.adminService.getUsers(
          Number(page) || 1,
          Number(limit) || 10,
        );
      }

    @Get('groups')
        getGroups(
          @Query('page') page: string,
          @Query('limit') limit: string,
        ) {
          return this.adminService.getGroups(
            Number(page) || 1,
            Number(limit) || 10,
          );
        }

    @Get('groups/:id')
            getGroupDetails(@Param('id') id: string) {
              return this.adminService.getGroupDetails(id);
            }

    @Get('cycles')
            getCycles(
              @Query('page') page: string,
              @Query('limit') limit: string,
            ) {
              return this.adminService.getCycles(
                Number(page) || 1,
                Number(limit) || 10,
              );
        }

    @Get('cycles/:id')
            getCycleDetails(@Param('id') id: string) {
              return this.adminService.getCycleDetails(id);
            }

    
}