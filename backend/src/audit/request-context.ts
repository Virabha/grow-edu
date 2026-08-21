import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  ipAddress: string | null;
  userAgent: string | null;
  request: { user?: { userId?: string; role?: string; impersonatorId?: string } };
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function currentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
