import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw error when no token
  handleRequest<TUser extends JwtUser = JwtUser>(err: unknown, user: TUser | false | null | undefined, _info: unknown, _context: ExecutionContext): TUser {
    // Return user if authenticated, otherwise return undefined (don't throw)
    return (user || undefined) as TUser;
  }
}

