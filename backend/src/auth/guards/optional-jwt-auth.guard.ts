import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw error when no token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Return user if authenticated, otherwise return undefined (don't throw)
    return user || undefined;
  }
}

