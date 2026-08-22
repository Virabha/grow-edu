import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { AuditLogService } from "../audit/audit-log.service";
import { CLOCK, Clock } from "../common/clock";
import { DATABASE_CONNECTION } from "../database/database.module";
import * as schema from "../database/schema";
import {
  DEFAULT_ORGANIZATION_ID,
  InvoiceLine,
  invoiceSequences,
  invoices,
  payments,
  users,
} from "../database/schema";
import { Queryable, Transaction } from "../database/transaction";
import { IssueCreditNoteDto } from "./dto/issue-credit-note.dto";

export const INVOICE_SERIES = "INV";
export const CREDIT_NOTE_SERIES = "CN";

const SEQUENCE_WIDTH = 6;

export interface InvoiceView {
  invoiceId: string;
  invoiceNo: string;
  kind: "INVOICE" | "CREDIT_NOTE";
  paymentId: string | null;
  contractId: string | null;
  correctsInvoiceId: string | null;
  correctsInvoiceNo: string | null;
  buyerUserId: string;
  buyerName: string;
  buyerEmail: string;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lines: InvoiceLine[];
  reason: string | null;
  issuedAt: string;
}

type InvoiceRow = typeof invoices.$inferSelect;

function money(value: string | null | undefined): number {
  return Number(value ?? 0);
}

function format(series: string, sequence: number): string {
  return `${series}-${String(sequence).padStart(SEQUENCE_WIDTH, "0")}`;
}

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly auditLog: AuditLogService,
  ) {}

  async issueForPayment(
    paymentId: string,
    tx?: Transaction,
  ): Promise<InvoiceView | null> {
    if (tx) return this.issueForPaymentIn(tx, paymentId);
    return this.db.transaction((inner) =>
      this.issueForPaymentIn(inner, paymentId),
    );
  }

  private async issueForPaymentIn(
    tx: Transaction,
    paymentId: string,
  ): Promise<InvoiceView | null> {
    const [existing] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.paymentId, paymentId))
      .limit(1);
    if (existing) return this.toView(existing, null);

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.paymentId, paymentId))
      .limit(1);
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "COMPLETED") return null;

    const buyer = await this.buyer(tx, payment.userId);
    const subtotal = money(payment.originalAmount ?? payment.amount);
    const discount = money(payment.discountAmount);
    const tax = money(payment.taxAmount);
    const total = money(payment.amount);

    const description =
      payment.itemType === "CORPORATE_CONTRACT"
        ? "Corporate seat contract"
        : this.batchTitle(payment.metadata);

    const lines: InvoiceLine[] = [
      {
        description,
        quantity: 1,
        unitPrice: subtotal.toFixed(2),
        amount: subtotal.toFixed(2),
      },
    ];

    const number = await this.nextNumber(tx, INVOICE_SERIES);

    const [row] = await tx
      .insert(invoices)
      .values({
        kind: "INVOICE",
        series: INVOICE_SERIES,
        sequence: number.sequence,
        invoiceNo: number.invoiceNo,
        paymentId: payment.paymentId,
        contractId: payment.corporateContractId,
        buyerUserId: payment.userId,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        currency: payment.currency,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        lines,
        issuedAt: this.clock.now(),
      })
      .returning();

    await tx
      .update(payments)
      .set({ invoiceNo: number.invoiceNo })
      .where(eq(payments.paymentId, payment.paymentId));

    return this.toView(row, null);
  }

  async issueCreditNote(
    invoiceId: string,
    dto: IssueCreditNoteDto,
    actingAdminId: string,
  ): Promise<InvoiceView> {
    const created = await this.db.transaction(async (tx) => {
      const [original] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceId, invoiceId))
        .limit(1);
      if (!original) throw new NotFoundException("Invoice not found");
      return this.creditNoteIn(tx, original, dto, actingAdminId);
    });

    await this.auditLog.record({
      action: "invoice.credit-note",
      targetType: "invoice",
      targetId: created.row.invoiceId,
      after: {
        invoiceNo: created.row.invoiceNo,
        corrects: created.original.invoiceNo,
        total: created.row.total,
        reason: dto.reason,
      },
    });

    return this.toView(created.row, created.original.invoiceNo);
  }

  async creditForPayment(
    tx: Transaction,
    paymentId: string,
    dto: IssueCreditNoteDto,
    actingAdminId: string,
  ): Promise<InvoiceView | null> {
    const [original] = await tx
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.paymentId, paymentId), eq(invoices.kind, "INVOICE")),
      )
      .limit(1);
    if (!original) return null;

    const created = await this.creditNoteIn(tx, original, dto, actingAdminId);
    return this.toView(created.row, created.original.invoiceNo);
  }

  private async creditNoteIn(
    tx: Transaction,
    original: InvoiceRow,
    dto: IssueCreditNoteDto,
    actingAdminId: string,
  ): Promise<{ row: InvoiceRow; original: InvoiceRow }> {
    if (original.kind !== "INVOICE") {
      throw new BadRequestException("A credit note cannot correct a credit note");
    }

    const credited = await this.creditedSoFar(tx, original.invoiceId);
    const remaining = money(original.total) - credited;
    const amount = dto.amount ?? remaining;

    if (amount <= 0) {
      throw new BadRequestException("A credit note must be for a positive amount");
    }
    if (amount > remaining + 1e-9) {
      throw new ConflictException(
        `This invoice has only ${remaining.toFixed(2)} left to credit`,
      );
    }

    const number = await this.nextNumber(tx, CREDIT_NOTE_SERIES);
    const lines: InvoiceLine[] = [
      {
        description: `Correction of ${original.invoiceNo}: ${dto.reason}`,
        quantity: 1,
        unitPrice: amount.toFixed(2),
        amount: amount.toFixed(2),
      },
    ];

    const [row] = await tx
      .insert(invoices)
      .values({
        kind: "CREDIT_NOTE",
        series: CREDIT_NOTE_SERIES,
        sequence: number.sequence,
        invoiceNo: number.invoiceNo,
        correctsInvoiceId: original.invoiceId,
        contractId: original.contractId,
        buyerUserId: original.buyerUserId,
        buyerName: original.buyerName,
        buyerEmail: original.buyerEmail,
        currency: original.currency,
        subtotal: amount.toFixed(2),
        discount: "0",
        tax: "0",
        total: amount.toFixed(2),
        lines,
        reason: dto.reason,
        issuedAt: this.clock.now(),
        issuedBy: actingAdminId,
      })
      .returning();

    return { row, original };
  }

  async listForUser(userId: string): Promise<InvoiceView[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.buyerUserId, userId))
      .orderBy(desc(invoices.issuedAt));
    return this.withOriginals(rows);
  }

  async listAll(): Promise<InvoiceView[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .orderBy(invoices.series, invoices.sequence);
    return this.withOriginals(rows);
  }

  async listForContract(contractId: string): Promise<InvoiceView[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.contractId, contractId))
      .orderBy(invoices.series, invoices.sequence);
    return this.withOriginals(rows);
  }

  async getOne(
    invoiceId: string,
    viewer: { userId: string; role: string },
  ): Promise<InvoiceView> {
    const [row] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceId, invoiceId))
      .limit(1);
    if (!row) throw new NotFoundException("Invoice not found");
    if (row.buyerUserId !== viewer.userId && viewer.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("This invoice belongs to someone else");
    }
    const [view] = await this.withOriginals([row]);
    return view;
  }

  private async withOriginals(rows: InvoiceRow[]): Promise<InvoiceView[]> {
    const originalIds = rows
      .map((row) => row.correctsInvoiceId)
      .filter((id): id is string => id !== null);
    const byId = new Map<string, string>();

    for (const id of new Set(originalIds)) {
      const [original] = await this.db
        .select({ invoiceNo: invoices.invoiceNo })
        .from(invoices)
        .where(eq(invoices.invoiceId, id))
        .limit(1);
      if (original) byId.set(id, original.invoiceNo);
    }

    return rows.map((row) =>
      this.toView(
        row,
        row.correctsInvoiceId ? byId.get(row.correctsInvoiceId) ?? null : null,
      ),
    );
  }

  private async nextNumber(
    tx: Transaction,
    series: string,
  ): Promise<{ sequence: number; invoiceNo: string }> {
    await tx
      .insert(invoiceSequences)
      .values({ series, nextValue: 1 })
      .onConflictDoNothing();

    const locked = await tx.execute<{ next_value: number }>(
      sql`select next_value from invoice_sequences
          where organization_id = ${DEFAULT_ORGANIZATION_ID} and series = ${series}
          for update`,
    );
    const sequence = Number(locked[0]?.next_value ?? 1);

    await tx
      .update(invoiceSequences)
      .set({ nextValue: sequence + 1, updatedAt: this.clock.now() })
      .where(
        and(
          eq(invoiceSequences.organizationId, DEFAULT_ORGANIZATION_ID),
          eq(invoiceSequences.series, series),
        ),
      );

    return { sequence, invoiceNo: format(series, sequence) };
  }

  private async creditedSoFar(
    tx: Queryable,
    invoiceId: string,
  ): Promise<number> {
    const [row] = await tx
      .select({ credited: sql<string>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.correctsInvoiceId, invoiceId),
          eq(invoices.kind, "CREDIT_NOTE"),
        ),
      );
    return money(row?.credited);
  }

  private async buyer(
    tx: Queryable,
    userId: string,
  ): Promise<{ name: string; email: string }> {
    const [user] = await tx
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);
    if (!user) return { name: "Unknown", email: "unknown@example.invalid" };
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return { name: name.length > 0 ? name : user.email, email: user.email };
  }

  private batchTitle(metadata: unknown): string {
    if (metadata && typeof metadata === "object") {
      const title = (metadata as { batchTitle?: unknown }).batchTitle;
      if (typeof title === "string" && title.length > 0) return title;
    }
    return "Batch enrolment";
  }

  private toView(row: InvoiceRow, correctsInvoiceNo: string | null): InvoiceView {
    return {
      invoiceId: row.invoiceId,
      invoiceNo: row.invoiceNo,
      kind: row.kind,
      paymentId: row.paymentId,
      contractId: row.contractId,
      correctsInvoiceId: row.correctsInvoiceId,
      correctsInvoiceNo,
      buyerUserId: row.buyerUserId,
      buyerName: row.buyerName,
      buyerEmail: row.buyerEmail,
      currency: row.currency,
      subtotal: money(row.subtotal),
      discount: money(row.discount),
      tax: money(row.tax),
      total: money(row.total),
      lines: row.lines,
      reason: row.reason,
      issuedAt: row.issuedAt.toISOString(),
    };
  }
}
