import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { BATCH_ACCESS_KEY } from "./batch-access.decorator";
import { AccessLevel, BatchAccessService } from "./batch-access.service";

interface AuthedRequest {
  user?: { userId: string; role: string };
  params?: Record<string, string | undefined>;
}

@Injectable()
export class BatchAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: BatchAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const level = this.reflector.getAllAndOverride<AccessLevel | undefined>(
      BATCH_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!level) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const batchId = req.params?.batchId;
    if (!batchId) return false;

    await this.access.require(batchId, req.user ?? {}, level);
    return true;
  }
}
