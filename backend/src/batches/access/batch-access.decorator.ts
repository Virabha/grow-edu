import { SetMetadata } from "@nestjs/common";
import { AccessLevel } from "./batch-access.service";

export const BATCH_ACCESS_KEY = "batchAccess";

export const BatchAccess = (level: AccessLevel) =>
  SetMetadata(BATCH_ACCESS_KEY, level);
