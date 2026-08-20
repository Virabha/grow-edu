import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AccountSuspensionService } from '../account-suspension.service';
import { DeviceRevocationService } from '../device-revocation.service';

interface RequestWithUser {
  user?: { userId?: string; deviceId?: string };
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly deviceRevocation: DeviceRevocationService,
    private readonly accountSuspension: AccountSuspensionService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowed = await super.canActivate(context);
    if (!allowed) {
      return false;
    }

    const now = Date.now();
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const deviceId = request.user?.deviceId;
    if (deviceId && (await this.deviceRevocation.isRevoked(deviceId, now))) {
      throw new UnauthorizedException('This device has been signed out');
    }

    const userId = request.user?.userId;
    if (userId && (await this.accountSuspension.isSuspended(userId, now))) {
      throw new UnauthorizedException('This account has been suspended');
    }

    return true;
  }
}
