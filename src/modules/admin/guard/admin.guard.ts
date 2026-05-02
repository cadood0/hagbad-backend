import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (!req.user) {
      throw new ForbiddenException('No user found');
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admins only');
    }

    return true;
  }
}