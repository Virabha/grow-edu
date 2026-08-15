import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as PDFDocument from "pdfkit";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  batchAttendance,
  batchCertificates,
  batchEnrollments,
  batchQuizAttempts,
  batchQuizzes,
  batchSessions,
  batches,
  users,
} from "../database/schema";
import { NotificationsService } from "../notifications/notifications.service";
import { CertificateTemplateService } from "../certificate-template/certificate-template.service";

type DbType = PostgresJsDatabase<typeof schema>;

export interface CertificateRow {
  certificateId: string;
  batchId: string;
  userId: string;
  certificateNumber: string;
  issuedAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class CertificateService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DbType,
    private readonly notificationsService: NotificationsService,
    private readonly certificateTemplateService: CertificateTemplateService,
  ) {}

  private generateCertificateNumber(batchId: string, userId: string): string {
    const year = new Date().getFullYear();
    const b = batchId.slice(0, 6).toUpperCase();
    const u = userId.slice(0, 6).toUpperCase();
    return `GRO-${b}-${u}-${year}`;
  }

  async issue(
    batchId: string,
    userId: string,
    opts: { requireCompletion?: boolean } = {}
  ): Promise<CertificateRow> {
    const [batch] = await this.db
      .select()
      .from(batches)
      .where(and(eq(batches.batchId, batchId), eq(batches.isDeleted, false)))
      .limit(1);
    if (!batch) throw new NotFoundException("Batch not found");

    const [enrollment] = await this.db
      .select()
      .from(batchEnrollments)
      .where(
        and(
          eq(batchEnrollments.batchId, batchId),
          eq(batchEnrollments.userId, userId),
          eq(batchEnrollments.status, "ACTIVE")
        )
      )
      .limit(1);
    if (!enrollment) throw new BadRequestException("Student is not enrolled");

    if (opts.requireCompletion) {
      const [{ liveTotal }] = await this.db
        .select({ liveTotal: sql<number>`count(*)::int` })
        .from(batchSessions)
        .where(
          and(
            eq(batchSessions.batchId, batchId),
            eq(batchSessions.type, "LIVE"),
            eq(batchSessions.isDeleted, false)
          )
        );
      const [{ attended }] = await this.db
        .select({ attended: sql<number>`count(*)::int` })
        .from(batchAttendance)
        .where(
          and(
            eq(batchAttendance.batchId, batchId),
            eq(batchAttendance.userId, userId)
          )
        );
      const pct = liveTotal > 0 ? (attended / liveTotal) * 100 : 100;
      if (pct < 60) {
        throw new BadRequestException(
          `Attendance ${pct.toFixed(1)}% below required 60%`
        );
      }
    }

    const [existing] = await this.db
      .select()
      .from(batchCertificates)
      .where(
        and(
          eq(batchCertificates.batchId, batchId),
          eq(batchCertificates.userId, userId)
        )
      )
      .limit(1);
    if (existing) return existing as CertificateRow;

    const [created] = await this.db
      .insert(batchCertificates)
      .values({
        batchId,
        userId,
        certificateNumber: this.generateCertificateNumber(batchId, userId),
      })
      .returning();

    await this.notificationsService.create({
      userId,
      type: "BATCH_CERTIFICATE",
      title: `Certificate issued — ${batch.title}`,
      body: `Your certificate ${created.certificateNumber} is ready to download.`,
      link: `/batches/${batch.slug}/certificate`,
      batchId,
    });

    return created as CertificateRow;
  }

  async revoke(batchId: string, userId: string) {
    await this.db
      .update(batchCertificates)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(batchCertificates.batchId, batchId),
          eq(batchCertificates.userId, userId)
        )
      );
    return { success: true };
  }

  async getForUser(batchId: string, userId: string) {
    const [cert] = await this.db
      .select()
      .from(batchCertificates)
      .where(
        and(
          eq(batchCertificates.batchId, batchId),
          eq(batchCertificates.userId, userId)
        )
      )
      .limit(1);
    return cert ?? null;
  }

  async listForBatch(batchId: string) {
    return this.db
      .select({
        cert: batchCertificates,
        user: {
          userId: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(batchCertificates)
      .innerJoin(users, eq(batchCertificates.userId, users.userId))
      .where(eq(batchCertificates.batchId, batchId));
  }

  async listMyCertificates(userId: string) {
    return this.db
      .select({
        cert: batchCertificates,
        batch: {
          batchId: batches.batchId,
          title: batches.title,
          slug: batches.slug,
        },
      })
      .from(batchCertificates)
      .innerJoin(batches, eq(batchCertificates.batchId, batches.batchId))
      .where(eq(batchCertificates.userId, userId));
  }

  async renderPdf(batchId: string, userId: string): Promise<Buffer> {
    const [cert] = await this.db
      .select()
      .from(batchCertificates)
      .where(
        and(
          eq(batchCertificates.batchId, batchId),
          eq(batchCertificates.userId, userId)
        )
      )
      .limit(1);
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.revokedAt) throw new ForbiddenException("Certificate revoked");

    const [batch] = await this.db
      .select()
      .from(batches)
      .where(eq(batches.batchId, batchId))
      .limit(1);
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    if (!batch || !user) throw new NotFoundException("Source data missing");

    const [{ liveTotal }] = await this.db
      .select({ liveTotal: sql<number>`count(*)::int` })
      .from(batchSessions)
      .where(
        and(
          eq(batchSessions.batchId, batchId),
          eq(batchSessions.type, "LIVE"),
          eq(batchSessions.isDeleted, false)
        )
      );
    const [{ attended }] = await this.db
      .select({ attended: sql<number>`count(*)::int` })
      .from(batchAttendance)
      .where(
        and(
          eq(batchAttendance.batchId, batchId),
          eq(batchAttendance.userId, userId)
        )
      );
    const myQuizAttempts = await this.db
      .select({
        score: batchQuizAttempts.score,
        maxScore: batchQuizAttempts.maxScore,
        quizId: batchQuizAttempts.quizId,
      })
      .from(batchQuizAttempts)
      .innerJoin(batchQuizzes, eq(batchQuizAttempts.quizId, batchQuizzes.quizId))
      .where(
        and(
          eq(batchQuizzes.batchId, batchId),
          eq(batchQuizAttempts.userId, userId),
          eq(batchQuizAttempts.status, "SUBMITTED")
        )
      );
    const bestByQuiz = new Map<string, { score: number; max: number }>();
    for (const a of myQuizAttempts) {
      const s = a.score ? Number(a.score) : 0;
      const m = a.maxScore ? Number(a.maxScore) : 0;
      const prev = bestByQuiz.get(a.quizId);
      if (!prev || s > prev.score) bestByQuiz.set(a.quizId, { score: s, max: m });
    }
    const totalScore = [...bestByQuiz.values()].reduce((s, v) => s + v.score, 0);
    const totalMax = [...bestByQuiz.values()].reduce((s, v) => s + v.max, 0);
    const quizPct = totalMax > 0 ? (totalScore / totalMax) * 100 : null;
    const attendancePct = liveTotal > 0 ? (attended / liveTotal) * 100 : null;

    const learnerName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    const template = await this.certificateTemplateService.get();
    const accent = template.accentColour;
    const issuedDate = new Date(cert.issuedAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const bodyText = template.bodyText
      ? template.bodyText
          .replace("{{learner_name}}", learnerName)
          .replace("{{course_title}}", batch.title)
          .replace("{{completion_date}}", issuedDate)
      : null;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const w = doc.page.width;
      const h = doc.page.height;

      doc.lineWidth(2).strokeColor(accent).rect(30, 30, w - 60, h - 60).stroke();
      doc.lineWidth(0.5).strokeColor(accent).rect(40, 40, w - 80, h - 80).stroke();

      doc
        .fillColor(accent)
        .font("Helvetica-Bold")
        .fontSize(34)
        .text("Certificate of Completion", 60, 90, { align: "center", width: w - 120 });

      doc
        .fillColor("#6b7280")
        .font("Helvetica")
        .fontSize(12)
        .text("Issued by Grotutor — Online Learning Platform", {
          align: "center",
          width: w - 120,
        });

      doc.moveDown(2);

      if (bodyText) {
        doc
          .fillColor("#1f2937")
          .font("Helvetica")
          .fontSize(14)
          .text(bodyText, { align: "center", width: w - 120 });
      } else {
        doc
          .fillColor("#1f2937")
          .fontSize(14)
          .text("This is to certify that", { align: "center", width: w - 120 });

        doc.moveDown(0.6);
        doc
          .fillColor(accent)
          .font("Helvetica-Bold")
          .fontSize(28)
          .text(learnerName, { align: "center", width: w - 120 });

        doc.moveDown(0.6);
        doc
          .fillColor("#1f2937")
          .font("Helvetica")
          .fontSize(14)
          .text("has successfully completed the batch", { align: "center", width: w - 120 });

        doc.moveDown(0.4);
        doc
          .fillColor(accent)
          .font("Helvetica-Bold")
          .fontSize(20)
          .text(batch.title, { align: "center", width: w - 120 });

        if (batch.targetExam) {
          doc.moveDown(0.2);
          doc
            .fillColor("#6b7280")
            .font("Helvetica-Oblique")
            .fontSize(12)
            .text(batch.targetExam, { align: "center", width: w - 120 });
        }
      }

      doc.moveDown(2);
      const statsY = doc.y;
      const colW = (w - 120) / 3;
      const drawStat = (x: number, label: string, value: string) => {
        doc
          .fillColor(accent)
          .font("Helvetica-Bold")
          .fontSize(18)
          .text(value, x, statsY, { width: colW, align: "center" });
        doc
          .fillColor("#6b7280")
          .font("Helvetica")
          .fontSize(10)
          .text(label, x, statsY + 24, { width: colW, align: "center" });
      };
      drawStat(60, "Attendance", attendancePct != null ? `${attendancePct.toFixed(0)}%` : "—");
      drawStat(
        60 + colW,
        "Tests attempted",
        `${bestByQuiz.size} / ${myQuizAttempts.length > 0 ? bestByQuiz.size : "—"}`
      );
      drawStat(60 + colW * 2, "Avg quiz score", quizPct != null ? `${quizPct.toFixed(0)}%` : "—");

      const footerY = h - 120;

      if (template.signatoryName) {
        doc
          .fillColor("#6b7280")
          .font("Helvetica")
          .fontSize(10)
          .text(template.signatoryTitle, 60, footerY, { width: 200 })
          .fillColor("#1f2937")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(template.signatoryName, 60, footerY + 12, { width: 250 });
      }

      if (template.showCertificateId) {
        doc
          .fillColor("#6b7280")
          .font("Helvetica")
          .fontSize(10)
          .text("Certificate No.", 60, footerY + (template.signatoryName ? 28 : 0), { width: 200 })
          .fillColor("#1f2937")
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(cert.certificateNumber, 60, footerY + (template.signatoryName ? 40 : 12), { width: 250 });
      }

      doc
        .fillColor("#6b7280")
        .font("Helvetica")
        .fontSize(10)
        .text("Issued on", w - 260, footerY, { width: 200, align: "right" })
        .fillColor("#1f2937")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(issuedDate, w - 260, footerY + 12, { width: 200, align: "right" });

      doc.end();
    });
  }
}
