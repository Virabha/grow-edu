import { Injectable, NotFoundException, ForbiddenException, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq, desc, and, sql, isNull, ne } from 'drizzle-orm';
import { userDevices, users } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { AccountSuspensionService } from '../auth/account-suspension.service';
import { DeviceRevocationService } from '../auth/device-revocation.service';
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
    private readonly deviceRevocation: DeviceRevocationService,
    private readonly accountSuspension: AccountSuspensionService,
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
  },
  /** When set, results are limited to this user's own company. Used for
   *  corporate admins, whose JWT carries no companyId — it is read from their
   *  record here so a query parameter can never widen the scope. */
  scopeToCompanyOfUserId?: string) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (scopeToCompanyOfUserId) {
      const [caller] = await this.db
        .select({ companyId: users.companyId })
        .from(users)
        .where(eq(users.userId, scopeToCompanyOfUserId))
        .limit(1);
      // No company means no colleagues to list, never the whole directory.
      conditions.push(
        caller?.companyId
          ? eq(users.companyId, caller.companyId)
          : sql`false`,
      );
    }

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

  async suspend(targetUserId: string, reason: string, actingAdminId: string) {
    if (targetUserId === actingAdminId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }

    const [suspended] = await this.db
      .update(users)
      .set({
        suspendedAt: new Date(),
        suspensionReason: reason,
        suspendedBy: actingAdminId,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, targetUserId))
      .returning({
        userId: users.userId,
        suspendedAt: users.suspendedAt,
        suspensionReason: users.suspensionReason,
      });

    if (!suspended) {
      throw new NotFoundException('User not found');
    }

    this.accountSuspension.forget(targetUserId);
    await this.revokeEveryDevice(targetUserId);

    return {
      message: 'Account suspended',
      userId: suspended.userId,
      suspendedAt: suspended.suspendedAt,
      reason: suspended.suspensionReason,
    };
  }

  async reinstate(targetUserId: string) {
    const [reinstated] = await this.db
      .update(users)
      .set({
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, targetUserId))
      .returning({ userId: users.userId });

    if (!reinstated) {
      throw new NotFoundException('User not found');
    }

    this.accountSuspension.forget(targetUserId);

    return { message: 'Account reinstated', userId: reinstated.userId };
  }

  private async revokeEveryDevice(userId: string) {
    const conditions = and(
      eq(userDevices.userId, userId),
      isNull(userDevices.revokedAt),
    );

    const rows = await this.db
      .select({ deviceId: userDevices.deviceId })
      .from(userDevices)
      .where(conditions);

    if (rows.length === 0) return;

    await this.db
      .update(userDevices)
      .set({ revokedAt: new Date() })
      .where(conditions);

    for (const row of rows) {
      this.deviceRevocation.forget(row.deviceId);
    }
  }

  async getMe(userId: string) {
    const [user] = await this.db
      .select({
        id: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        companyId: users.companyId,
        profileImage: users.profileImage,
        emailVerified: users.emailVerified,
        headline: users.headline,
        bio: users.bio,
        phone: users.phone,
        addressLine: users.addressLine,
        city: users.city,
        state: users.state,
        country: users.country,
        postalCode: users.postalCode,
        social: users.social,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      profileImage: this.ensureProfileImageUrl(user.profileImage),
    };
  }

  async updateMe(userId: string, dto: {
    firstName?: string;
    lastName?: string;
    profileImage?: string | null;
    headline?: string;
    bio?: string;
    phone?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    social?: Record<string, string>;
  }) {
    const [user] = await this.db
      .select({ userId: users.userId, profileImage: users.profileImage })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.profileImage !== undefined && dto.profileImage !== null) {
      dto.profileImage = this.filesService.extractKey(dto.profileImage);
      const oldKey = user.profileImage ? this.filesService.extractKey(user.profileImage) : null;
      if (oldKey && oldKey !== dto.profileImage) {
        this.filesService.deleteFile(oldKey).catch((err: Error) => {
          this.logger.warn(`Failed to delete old profile image: ${err.message}`);
        });
      }
    }

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.profileImage !== undefined) updates.profileImage = dto.profileImage;
    if (dto.headline !== undefined) updates.headline = dto.headline;
    if (dto.bio !== undefined) updates.bio = dto.bio;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.addressLine !== undefined) updates.addressLine = dto.addressLine;
    if (dto.city !== undefined) updates.city = dto.city;
    if (dto.state !== undefined) updates.state = dto.state;
    if (dto.country !== undefined) updates.country = dto.country;
    if (dto.postalCode !== undefined) updates.postalCode = dto.postalCode;
    if (dto.social !== undefined) updates.social = dto.social;

    await this.db.update(users).set(updates).where(eq(users.userId, userId));

    return this.getMe(userId);
  }

  async listDevices(userId: string, currentDeviceId?: string) {
    const rows = await this.db
      .select({
        deviceId: userDevices.deviceId,
        label: userDevices.label,
        userAgent: userDevices.userAgent,
        ipAddress: userDevices.ipAddress,
        lastSeenAt: userDevices.lastSeenAt,
        createdAt: userDevices.createdAt,
      })
      .from(userDevices)
      .where(and(eq(userDevices.userId, userId), isNull(userDevices.revokedAt)))
      .orderBy(desc(userDevices.lastSeenAt));

    return rows.map((row) => {
      const agent = row.userAgent ?? "";
      return {
        deviceId: row.deviceId,
        browser: describeBrowser(agent),
        os: describeOs(agent),
        deviceType: describeDeviceType(agent),
        location: "",
        ipAddress: row.ipAddress ?? "",
        lastActiveAt: row.lastSeenAt.toISOString(),
        current: currentDeviceId !== undefined && row.deviceId === currentDeviceId,
      };
    });
  }

  async revokeDevice(requestingUserId: string, deviceId: string) {
    const [device] = await this.db
      .select({ deviceId: userDevices.deviceId, userId: userDevices.userId })
      .from(userDevices)
      .where(and(eq(userDevices.deviceId, deviceId), isNull(userDevices.revokedAt)))
      .limit(1);

    if (!device || device.userId !== requestingUserId) {
      throw new NotFoundException('Device not found');
    }

    await this.db
      .update(userDevices)
      .set({ revokedAt: new Date() })
      .where(eq(userDevices.deviceId, deviceId));

    this.deviceRevocation.forget(deviceId);

    return { message: 'Device signed out' };
  }

  async revokeOtherDevices(userId: string, currentDeviceId: string | undefined) {
    const conditions = [
      eq(userDevices.userId, userId),
      isNull(userDevices.revokedAt),
    ];

    if (currentDeviceId) {
      conditions.push(ne(userDevices.deviceId, currentDeviceId));
    }

    const rows = await this.db
      .select({ deviceId: userDevices.deviceId })
      .from(userDevices)
      .where(and(...conditions));

    if (rows.length === 0) {
      return { message: 'No other active devices', removed: 0 };
    }

    await this.db
      .update(userDevices)
      .set({ revokedAt: new Date() })
      .where(and(...conditions));

    for (const row of rows) {
      this.deviceRevocation.forget(row.deviceId);
    }

    return { message: 'Other devices signed out', removed: rows.length };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await this.db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.db.update(users).set({ password: hashed, updatedAt: new Date() }).where(eq(users.userId, userId));

    return { message: 'Password updated successfully' };
  }

  async changeEmail(userId: string, email: string) {
    const [existing] = await this.db
      .select({ userId: users.userId })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing && existing.userId !== userId) {
      throw new ConflictException('Email is already in use');
    }

    await this.db
      .update(users)
      .set({ email, emailVerified: false, updatedAt: new Date() })
      .where(eq(users.userId, userId));

    return { message: 'Email updated. Please verify your new address.', email };
  }
}

function describeBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Unknown browser";
}

function describeOs(userAgent: string): string {
  if (/windows/i.test(userAgent)) return "Windows";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown OS";
}

function describeDeviceType(userAgent: string): "desktop" | "mobile" | "tablet" {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}
