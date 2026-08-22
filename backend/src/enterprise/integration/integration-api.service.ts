import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAttendance,
  batchEnrollments,
  corporateApiCredentials,
  corporateContractBatches,
  corporateContracts,
  corporateSeats,
  users,
} from "../../database/schema";
import { CLOCK, Clock } from "../../common/clock";
import { IssueCredentialDto } from "./dto/issue-credential.dto";

@Injectable()
export class IntegrationApiService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async issueCredential(
    dto: IssueCredentialDto,
    actorId: string,
  ): Promise<{ credentialId: string; key: string }> {
    const key = randomUUID();
    const keyHash = createHash("sha256").update(key).digest("hex");
    const now = this.clock.now();

    const [created] = await this.db
      .insert(corporateApiCredentials)
      .values({
        companyId: dto.companyId,
        label: dto.label,
        keyHash,
        issuedBy: actorId,
        issuedAt: now,
      })
      .returning({ credentialId: corporateApiCredentials.credentialId });

    return { credentialId: created.credentialId, key };
  }

  async revokeCredential(credentialId: string, actorId: string): Promise<void> {
    await this.db
      .update(corporateApiCredentials)
      .set({
        revokedAt: this.clock.now(),
        revokedBy: actorId,
      })
      .where(eq(corporateApiCredentials.credentialId, credentialId));
  }

  async listStudents(companyId: string) {
    const rows = await this.db
      .selectDistinct({
        userId: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(corporateSeats)
      .innerJoin(
        corporateContracts,
        eq(corporateContracts.contractId, corporateSeats.contractId),
      )
      .innerJoin(users, eq(users.userId, corporateSeats.userId))
      .where(
        and(
          eq(corporateContracts.companyId, companyId),
          isNull(corporateSeats.releasedAt),
        ),
      );

    return rows;
  }

  async getStudentProgress(companyId: string, userId: string) {
    const isMember = await this.isStudentOf(companyId, userId);
    if (!isMember) {
      throw new NotFoundException();
    }

    const enrollments = await this.db
      .select({
        batchId: batchEnrollments.batchId,
        status: batchEnrollments.status,
        source: batchEnrollments.source,
        accessStartsAt: batchEnrollments.accessStartsAt,
        accessEndsAt: batchEnrollments.accessEndsAt,
      })
      .from(batchEnrollments)
      .innerJoin(
        corporateContractBatches,
        eq(corporateContractBatches.batchId, batchEnrollments.batchId),
      )
      .innerJoin(
        corporateContracts,
        eq(corporateContracts.contractId, corporateContractBatches.contractId),
      )
      .where(
        and(
          eq(corporateContracts.companyId, companyId),
          eq(batchEnrollments.userId, userId),
        ),
      );

    return { userId, enrollments };
  }

  async getStudentAttendance(companyId: string, userId: string) {
    const isMember = await this.isStudentOf(companyId, userId);
    if (!isMember) {
      throw new NotFoundException();
    }

    const records = await this.db
      .select({
        batchId: batchAttendance.batchId,
        sessionId: batchAttendance.sessionId,
        joinedAt: batchAttendance.joinedAt,
        durationSeconds: batchAttendance.durationSeconds,
        source: batchAttendance.source,
      })
      .from(batchAttendance)
      .innerJoin(
        corporateContractBatches,
        eq(corporateContractBatches.batchId, batchAttendance.batchId),
      )
      .innerJoin(
        corporateContracts,
        eq(corporateContracts.contractId, corporateContractBatches.contractId),
      )
      .where(
        and(
          eq(corporateContracts.companyId, companyId),
          eq(batchAttendance.userId, userId),
        ),
      );

    return { userId, records };
  }

  private async isStudentOf(
    companyId: string,
    userId: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ seatId: corporateSeats.seatId })
      .from(corporateSeats)
      .innerJoin(
        corporateContracts,
        eq(corporateContracts.contractId, corporateSeats.contractId),
      )
      .where(
        and(
          eq(corporateContracts.companyId, companyId),
          eq(corporateSeats.userId, userId),
          isNull(corporateSeats.releasedAt),
        ),
      )
      .limit(1);

    return row !== undefined;
  }
}
