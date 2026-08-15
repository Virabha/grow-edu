/**
 * Unit test for the BatchManagerGuard bug fix:
 * A deleted (isDeleted=true) or missing batch must throw NotFoundException (404),
 * not ForbiddenException (403), so a caller cannot distinguish "batch deleted"
 * from "batch never existed" purely from the HTTP status code.
 */
import { ExecutionContext, ForbiddenException, NotFoundException } from "@nestjs/common";
import { BatchManagerGuard } from "./batch-manager.guard";

function makeContext(user: { userId: string; role: string }, batchId: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: { batchId },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("BatchManagerGuard › deleted / missing batch", () => {
  it("throws NotFoundException when the batch row is missing (no row returned)", async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]), // no row
      }),
    };
    const guard = new BatchManagerGuard(db as never);
    const ctx = makeContext({ userId: "inst-1", role: "INSTRUCTOR" }, "ghost-batch-id");

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws NotFoundException when the batch is soft-deleted (isDeleted=true)", async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ teacherIds: [], isDeleted: true }]),
      }),
    };
    const guard = new BatchManagerGuard(db as never);
    const ctx = makeContext({ userId: "inst-1", role: "INSTRUCTOR" }, "deleted-batch-id");

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not throw ForbiddenException for a missing/deleted batch", async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }),
    };
    const guard = new BatchManagerGuard(db as never);
    const ctx = makeContext({ userId: "inst-1", role: "INSTRUCTOR" }, "ghost-id");

    const err = await guard.canActivate(ctx).catch((e) => e);
    expect(err).not.toBeInstanceOf(ForbiddenException);
  });

  it("throws ForbiddenException (not NotFoundException) for an instructor not on the batch", async () => {
    const db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ teacherIds: ["other-inst"], isDeleted: false }]),
      }),
    };
    const guard = new BatchManagerGuard(db as never);
    const ctx = makeContext({ userId: "inst-1", role: "INSTRUCTOR" }, "real-batch-id");

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows PLATFORM_ADMIN without hitting the database", async () => {
    const db = { select: jest.fn() };
    const guard = new BatchManagerGuard(db as never);
    const ctx = makeContext({ userId: "admin-id", role: "PLATFORM_ADMIN" }, "any-batch");

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });
});
