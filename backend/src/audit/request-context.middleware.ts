import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { requestContextStorage } from "./request-context";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers["x-request-id"];
    requestContextStorage.run(
      {
        requestId: typeof header === "string" ? header : randomUUID(),
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        request: req as RequestWithUser,
      },
      () => next(),
    );
  }
}

type RequestWithUser = {
  user?: { userId?: string; role?: string; impersonatorId?: string };
};
