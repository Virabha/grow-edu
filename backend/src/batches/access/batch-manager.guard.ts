import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { BatchAccessService } from "./batch-access.service";

interface AuthedRequest {
  user?: { userId: string; role: string };
  params?: Record<string, string | undefined>;
}

@Injectable()
export class BatchManagerGuard implements CanActivate {
  constructor(private readonly access: BatchAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const batchId = req.params?.batchId;
    if (!batchId) return false;
    await this.access.require(batchId, req.user ?? {}, "MANAGE");
    return true;
  }
}
