import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { DATABASE_CONNECTION } from "../../database/database.module";
import * as schema from "../../database/schema";
import {
  batchAnnouncements,
  batchDoubtReplies,
  batchDoubts,
  batchResources,
  users,
} from "../../database/schema";
import { NotificationsService } from "../../notifications/notifications.service";
import { BatchAccessService, SignedInViewer, Viewer } from "../access/batch-access.service";
import { BatchMediaService } from "../batch-media.service";
import { CLOCK, Clock } from "../../common/clock";
import {
  CreateBatchAnnouncementDto,
  UpdateBatchAnnouncementDto,
} from "../dto/batch-announcement.dto";
import {
  CreateBatchDoubtDto,
  CreateDoubtReplyDto,
  UpdateBatchDoubtDto,
} from "../dto/batch-doubt.dto";
import {
  CreateBatchResourceDto,
  UpdateBatchResourceDto,
} from "../dto/batch-resource.dto";

const AUTHOR_COLUMNS = {
  userId: users.userId,
  firstName: users.firstName,
  lastName: users.lastName,
  profileImage: users.profileImage,
  role: users.role,
} as const;

@Injectable()
export class BatchEngagementService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly access: BatchAccessService,
    private readonly media: BatchMediaService,
    private readonly notifications: NotificationsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async listAnnouncements(batchId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, "READ");
    return this.db
      .select()
      .from(batchAnnouncements)
      .where(
        and(
          eq(batchAnnouncements.batchId, batchId),
          eq(batchAnnouncements.isDeleted, false),
        ),
      )
      .orderBy(
        desc(batchAnnouncements.pinned),
        desc(batchAnnouncements.createdAt),
      );
  }

  async createAnnouncement(
    batchId: string,
    dto: CreateBatchAnnouncementDto,
    authorId: string,
  ) {
    const batch = await this.access.requireBatch(batchId);
    const [created] = await this.db
      .insert(batchAnnouncements)
      .values({
        batchId,
        authorId,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? false,
      })
      .returning();

    await this.notifications.fanout(
      await this.access.enrolledUserIds(batchId),
      {
        type: "BATCH_ANNOUNCEMENT",
        title: `Announcement: ${dto.title}`,
        body: dto.body.slice(0, 200),
        link: `/batches/${batch.slug}?tab=announcements`,
        batchId,
      },
    );
    return created;
  }

  async updateAnnouncement(
    batchId: string,
    announcementId: string,
    dto: UpdateBatchAnnouncementDto,
  ) {
    await this.requireAnnouncement(batchId, announcementId);
    const [updated] = await this.db
      .update(batchAnnouncements)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.pinned !== undefined && { pinned: dto.pinned }),
        updatedAt: new Date(),
      })
      .where(eq(batchAnnouncements.announcementId, announcementId))
      .returning();
    return updated;
  }

  async deleteAnnouncement(batchId: string, announcementId: string) {
    await this.requireAnnouncement(batchId, announcementId);
    await this.db
      .update(batchAnnouncements)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchAnnouncements.announcementId, announcementId));
    return { success: true };
  }

  async listResources(
    batchId: string,
    viewer: Viewer,
    filters: { type?: "DPP" | "NOTES" | "REFERENCE"; subjectId?: string },
  ) {
    const { isStaff } = await this.access.require(batchId, viewer, "READ");
    const conditions = [
      eq(batchResources.batchId, batchId),
      eq(batchResources.isDeleted, false),
    ];
    if (filters.type) conditions.push(eq(batchResources.type, filters.type));
    if (filters.subjectId) {
      conditions.push(eq(batchResources.subjectId, filters.subjectId));
    }
    if (!isStaff) {
      const published = or(
        sql`${batchResources.publishAt} IS NULL`,
        sql`${batchResources.publishAt} <= now()`,
      );
      if (published) conditions.push(published);
    }

    const rows = await this.db
      .select()
      .from(batchResources)
      .where(and(...conditions))
      .orderBy(
        asc(batchResources.type),
        asc(batchResources.dayNumber),
        desc(batchResources.createdAt),
      );

    return rows.map((r) => ({ ...r, fileUrl: this.media.url(r.fileKey) }));
  }

  async createResource(
    batchId: string,
    dto: CreateBatchResourceDto,
    uploadedBy: string,
  ) {
    const batch = await this.access.requireBatch(batchId);
    const [created] = await this.db
      .insert(batchResources)
      .values({
        batchId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        fileKey: dto.fileKey,
        fileSize: dto.fileSize,
        pageCount: dto.pageCount,
        dayNumber: dto.dayNumber,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        uploadedBy,
      })
      .returning();

    if (!dto.publishAt || new Date(dto.publishAt) <= this.clock.now()) {
      const label =
        dto.type === "DPP" ? "DPP" : dto.type === "NOTES" ? "notes" : "resource";
      await this.notifications.fanout(
        await this.access.enrolledUserIds(batchId),
        {
          type: "BATCH_RESOURCE_ADDED",
          title: `New ${label}: ${dto.title}`,
          link: `/batches/${batch.slug}?tab=resources`,
          batchId,
        },
      );
    }
    return created;
  }

  async updateResource(
    batchId: string,
    resourceId: string,
    dto: UpdateBatchResourceDto,
  ) {
    await this.requireResource(batchId, resourceId);
    const [updated] = await this.db
      .update(batchResources)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.fileKey !== undefined && { fileKey: dto.fileKey }),
        ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
        ...(dto.pageCount !== undefined && { pageCount: dto.pageCount }),
        ...(dto.dayNumber !== undefined && { dayNumber: dto.dayNumber }),
        ...(dto.publishAt !== undefined && {
          publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        }),
        updatedAt: new Date(),
      })
      .where(eq(batchResources.resourceId, resourceId))
      .returning();
    return updated;
  }

  async deleteResource(batchId: string, resourceId: string) {
    await this.requireResource(batchId, resourceId);
    await this.db
      .update(batchResources)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchResources.resourceId, resourceId));
    return { success: true };
  }

  async listDoubts(
    batchId: string,
    viewer: SignedInViewer,
    filters: { mine?: boolean; status?: string },
  ) {
    await this.access.require(batchId, viewer, "READ");
    const conditions = [
      eq(batchDoubts.batchId, batchId),
      eq(batchDoubts.isDeleted, false),
    ];
    if (filters.mine) {
      conditions.push(eq(batchDoubts.askedBy, viewer.userId));
    }
    if (filters.status) {
      conditions.push(
        eq(
          batchDoubts.status,
          filters.status as "OPEN" | "ANSWERED" | "CLOSED",
        ),
      );
    }

    const rows = await this.db
      .select({ doubt: batchDoubts, author: AUTHOR_COLUMNS })
      .from(batchDoubts)
      .innerJoin(users, eq(batchDoubts.askedBy, users.userId))
      .where(and(...conditions))
      .orderBy(desc(batchDoubts.createdAt));

    return rows.map((r) => ({ ...r.doubt, author: this.presentAuthor(r.author) }));
  }

  async getDoubt(batchId: string, doubtId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, "READ");
    const [row] = await this.db
      .select({ doubt: batchDoubts, author: AUTHOR_COLUMNS })
      .from(batchDoubts)
      .innerJoin(users, eq(batchDoubts.askedBy, users.userId))
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Doubt not found");

    const replies = await this.db
      .select({ reply: batchDoubtReplies, author: AUTHOR_COLUMNS })
      .from(batchDoubtReplies)
      .innerJoin(users, eq(batchDoubtReplies.authorId, users.userId))
      .where(
        and(
          eq(batchDoubtReplies.doubtId, doubtId),
          eq(batchDoubtReplies.isDeleted, false),
        ),
      )
      .orderBy(asc(batchDoubtReplies.createdAt));

    return {
      ...row.doubt,
      author: this.presentAuthor(row.author),
      replies: replies.map((r) => ({
        ...r.reply,
        author: this.presentAuthor(r.author),
      })),
    };
  }

  async createDoubt(
    batchId: string,
    dto: CreateBatchDoubtDto,
    viewer: SignedInViewer,
  ) {
    await this.access.require(batchId, viewer, "READ");
    const [created] = await this.db
      .insert(batchDoubts)
      .values({
        batchId,
        askedBy: viewer.userId,
        title: dto.title,
        body: dto.body,
        subjectId: dto.subjectId,
        attachments: dto.attachments ?? [],
      })
      .returning();
    return created;
  }

  async updateDoubt(
    batchId: string,
    doubtId: string,
    dto: UpdateBatchDoubtDto,
    viewer: Viewer,
  ) {
    await this.access.require(batchId, viewer, "READ");
    const existing = await this.requireDoubt(batchId, doubtId);
    const isAuthor = existing.askedBy === viewer.userId;
    const isAdmin = viewer.role === "PLATFORM_ADMIN";
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException("Cannot edit this doubt");
    }

    const [updated] = await this.db
      .update(batchDoubts)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.subjectId !== undefined && { subjectId: dto.subjectId }),
        ...(dto.attachments !== undefined && { attachments: dto.attachments }),
        ...(dto.status !== undefined && isAdmin && { status: dto.status }),
        updatedAt: new Date(),
      })
      .where(eq(batchDoubts.doubtId, doubtId))
      .returning();
    return updated;
  }

  async deleteDoubt(batchId: string, doubtId: string, viewer: Viewer) {
    await this.access.require(batchId, viewer, "READ");
    const existing = await this.requireDoubt(batchId, doubtId);
    if (
      existing.askedBy !== viewer.userId &&
      viewer.role !== "PLATFORM_ADMIN"
    ) {
      throw new ForbiddenException("Cannot delete this doubt");
    }
    await this.db
      .update(batchDoubts)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchDoubts.doubtId, doubtId));
    return { success: true };
  }

  async addDoubtReply(
    batchId: string,
    doubtId: string,
    dto: CreateDoubtReplyDto,
    viewer: SignedInViewer,
  ) {
    const { batch, isStaff } = await this.access.require(
      batchId,
      viewer,
      "READ",
    );
    const doubt = await this.requireDoubt(batchId, doubtId);

    const [reply] = await this.db
      .insert(batchDoubtReplies)
      .values({
        doubtId,
        authorId: viewer.userId,
        body: dto.body,
        attachments: dto.attachments ?? [],
        isOfficial: isStaff,
      })
      .returning();

    await this.db
      .update(batchDoubts)
      .set({
        replyCount: sql`${batchDoubts.replyCount} + 1`,
        status: isStaff ? "ANSWERED" : doubt.status,
        updatedAt: new Date(),
      })
      .where(eq(batchDoubts.doubtId, doubtId));

    if (doubt.askedBy !== viewer.userId) {
      await this.notifications.create({
        userId: doubt.askedBy,
        type: "BATCH_DOUBT_REPLY",
        title: isStaff
          ? `Your doubt was answered: ${doubt.title}`
          : `New reply on: ${doubt.title}`,
        body: dto.body.slice(0, 200),
        link: `/batches/${batch.slug}/doubts/${doubtId}`,
        batchId,
      });
    }

    return reply;
  }

  async deleteDoubtReply(
    batchId: string,
    doubtId: string,
    replyId: string,
    viewer: Viewer,
  ) {
    await this.access.require(batchId, viewer, "READ");
    await this.requireDoubt(batchId, doubtId);
    const [reply] = await this.db
      .select()
      .from(batchDoubtReplies)
      .where(
        and(
          eq(batchDoubtReplies.replyId, replyId),
          eq(batchDoubtReplies.doubtId, doubtId),
        ),
      )
      .limit(1);
    if (!reply) throw new NotFoundException("Reply not found");
    if (reply.authorId !== viewer.userId && viewer.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenException("Cannot delete this reply");
    }
    await this.db
      .update(batchDoubtReplies)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(batchDoubtReplies.replyId, replyId));
    return { success: true };
  }

  private presentAuthor(author: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    profileImage: string | null;
    role: string;
  }) {
    return { ...author, profileImage: this.media.url(author.profileImage) };
  }

  private async requireDoubt(batchId: string, doubtId: string) {
    const [doubt] = await this.db
      .select()
      .from(batchDoubts)
      .where(
        and(
          eq(batchDoubts.doubtId, doubtId),
          eq(batchDoubts.batchId, batchId),
          eq(batchDoubts.isDeleted, false),
        ),
      )
      .limit(1);
    if (!doubt) throw new NotFoundException("Doubt not found");
    return doubt;
  }

  private async requireAnnouncement(batchId: string, announcementId: string) {
    const [announcement] = await this.db
      .select()
      .from(batchAnnouncements)
      .where(
        and(
          eq(batchAnnouncements.announcementId, announcementId),
          eq(batchAnnouncements.batchId, batchId),
          eq(batchAnnouncements.isDeleted, false),
        ),
      )
      .limit(1);
    if (!announcement) throw new NotFoundException("Announcement not found");
    return announcement;
  }

  private async requireResource(batchId: string, resourceId: string) {
    const [resource] = await this.db
      .select()
      .from(batchResources)
      .where(
        and(
          eq(batchResources.resourceId, resourceId),
          eq(batchResources.batchId, batchId),
          eq(batchResources.isDeleted, false),
        ),
      )
      .limit(1);
    if (!resource) throw new NotFoundException("Resource not found");
    return resource;
  }
}
