import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { users } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { FilesService } from '../files/files.service';

const MAX_PAGE_LIMIT = 50;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private emailService: EmailService,
    private filesService: FilesService,
  ) {}

  private ensureProfileImageUrl(profileImage: string | null): string | null {
    if (!profileImage) return null;
    if (profileImage.startsWith('http')) return profileImage;
    return this.filesService.getDownloadUrl(profileImage);
  }

  async findAll(filters?: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters?.role) {
      conditions.push(eq(users.role, filters.role as 'LEARNER' | 'INSTRUCTOR' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN'));
    }
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        sql`(${users.email} ILIKE ${searchPattern} OR ${users.firstName} ILIKE ${searchPattern} OR ${users.lastName} ILIKE ${searchPattern})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [allUsers, total] = await Promise.all([
      this.db
        .select({
          id: users.userId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImage: users.profileImage,
          emailVerified: users.emailVerified,
          companyId: users.companyId,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    const totalCount = Number(total[0]?.count || 0);

    return {
      data: allUsers.map(u => ({
        ...u,
        profileImage: this.ensureProfileImageUrl(u.profileImage),
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: string) {
    const [user] = await this.db
      .select({
        id: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImage: users.profileImage,
        emailVerified: users.emailVerified,
        companyId: users.companyId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.userId, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      ...user,
      profileImage: this.ensureProfileImageUrl(user.profileImage),
    };
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string, currentUserRole: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.userId, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Users can only update themselves unless admin
    if (currentUserRole !== 'PLATFORM_ADMIN' && id !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (dto.role && currentUserRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can change user roles');
    }

    // Only admins can flip the emailVerified flag — otherwise a learner could
    // bypass the email-verification gate by PUTing emailVerified: true on themselves.
    if (dto.emailVerified !== undefined && currentUserRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can change email verification status');
    }

    // Track if role is changing
    const roleChanged = dto.role && dto.role !== user.role;
    const oldRole = user.role;

    // Handle profile image: normalize URL to key, delete old image
    if (dto.profileImage !== undefined) {
      if (dto.profileImage) {
        dto.profileImage = this.filesService.extractKey(dto.profileImage);
      }
      const oldKey = user.profileImage ? this.filesService.extractKey(user.profileImage) : null;
      if (oldKey && oldKey !== dto.profileImage) {
        this.filesService.deleteFile(oldKey).catch((err) => {
          this.logger.warn(`Failed to delete old profile image: ${err.message}`);
        });
      }
    }

    const { role, emailVerified, ...rest } = dto;
    const updates: Partial<typeof users.$inferInsert> = {
      ...rest,
      updatedAt: new Date(),
    };
    if (currentUserRole === 'PLATFORM_ADMIN') {
      if (role !== undefined) updates.role = role;
      if (emailVerified !== undefined) updates.emailVerified = emailVerified;
    }

    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.userId, id))
      .returning({ userId: users.userId });

    // Send email notification if role changed
    if (roleChanged && dto.role) {
      try {
        await this.emailService.sendRoleChangeEmail({
          firstName: user.firstName,
          email: user.email,
          newRole: dto.role,
          oldRole: oldRole,
        });
      } catch {
        // Don't fail the update if email sending fails
      }
    }

    return this.findOne(updated.userId);
  }

  async delete(id: string, currentUserRole: string) {
    if (currentUserRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can delete users');
    }

    await this.db.delete(users).where(eq(users.userId, id));

    return { message: 'User deleted successfully' };
  }
}

