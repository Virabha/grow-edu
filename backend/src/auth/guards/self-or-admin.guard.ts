import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SELF_OR_ADMIN_KEY } from '../decorators/self-or-admin.decorator';

interface AuthedRequest {
  user?: { userId: string; role: string };
  params?: Record<string, string | undefined>;
}

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const param = this.reflector.getAllAndOverride<string | undefined>(
      SELF_OR_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!param) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new ForbiddenException('Authentication required');
    if (req.user.role === 'PLATFORM_ADMIN') return true;
    if (req.params?.[param] === req.user.userId) return true;

    throw new ForbiddenException('You can only act on your own account');
  }
}
