import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '../database/schema';
import { cartItems, courses, courseSections, enrollments, sectionAccess } from '../database/schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class CartService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly filesService: FilesService,
  ) {}

  private ensureThumbnailUrl(thumbnail: string | null | undefined): string | null {
    if (!thumbnail) return null;
    if (thumbnail.startsWith('http')) return thumbnail;
    return this.filesService.getDownloadUrl(thumbnail);
  }

  async list(userId: string) {
    const items = await this.db.query.cartItems.findMany({
      where: eq(cartItems.userId, userId),
      with: {
        course: true,
        section: {
          with: {
            course: true,
          },
        },
      },
    });

    return items.map((item) => {
      if (item.course && item.course.thumbnail) {
        item.course.thumbnail = this.ensureThumbnailUrl(item.course.thumbnail);
      }
      if (item.section?.course && item.section.course.thumbnail) {
        item.section.course.thumbnail = this.ensureThumbnailUrl(item.section.course.thumbnail);
      }
      return item;
    });
  }

  async add(userId: string, dto: AddToCartDto) {
    if (dto.itemType === 'COURSE' && !dto.courseId) {
      throw new BadRequestException('courseId is required for course items');
    }
    if (dto.itemType === 'SECTION' && !dto.sectionId) {
      throw new BadRequestException('sectionId is required for section items');
    }

    let price = '0';
    let currency = 'INR';
    let courseId: string | null = dto.courseId || null;
    let sectionId: string | null = dto.sectionId || null;

    if (dto.itemType === 'COURSE') {
      const course = await this.db.query.courses.findFirst({
        where: eq(courses.courseId, dto.courseId!),
      });
      if (!course) throw new NotFoundException('Course not found');
      price = course.price || '0';
      currency = course.currency;
    } else {
      const section = await this.db.query.courseSections.findFirst({
        where: eq(courseSections.sectionId, dto.sectionId!),
        with: { course: true },
      });
      if (!section) throw new NotFoundException('Section not found');
      if (section.isDeleted) {
        throw new BadRequestException('Section is not available');
      }
      if (section.priceType === 'INCLUDED' || !section.sectionPrice) {
        throw new BadRequestException('Section is not individually purchasable');
      }
      price = String(section.sectionPrice);
      currency = section.course.currency;
      courseId = section.courseId;
    }

    // Skip if user already has access
    const [existingEnrollment] =
      courseId && dto.itemType === 'COURSE'
        ? await this.db
            .select({ id: enrollments.enrollmentId })
            .from(enrollments)
            .where(and(
              eq(enrollments.courseId, courseId),
              eq(enrollments.userId, userId),
              inArray(enrollments.status, ['ACTIVE', 'COMPLETED']),
            ))
            .limit(1)
        : [null];

    if (existingEnrollment) {
      return existingEnrollment;
    }

    if (dto.itemType === 'SECTION') {
      const [existingAccess] = await this.db
        .select({ id: sectionAccess.sectionAccessId })
        .from(sectionAccess)
        .where(and(eq(sectionAccess.sectionId, sectionId!), eq(sectionAccess.userId, userId)))
        .limit(1);
      if (existingAccess) {
        return existingAccess;
      }
    }

    // Avoid duplicates in cart
    const [existingCartItem] = await this.db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.itemType, dto.itemType),
          eq(cartItems.courseId, courseId),
          eq(cartItems.sectionId, sectionId),
        ),
      )
      .limit(1);

    if (existingCartItem) {
      return existingCartItem;
    }

    const [inserted] = await this.db
      .insert(cartItems)
      .values({
        userId,
        itemType: dto.itemType,
        courseId,
        sectionId,
        price,
        currency,
      })
      .returning();

    return inserted;
  }

  async remove(userId: string, cartItemId: string) {
    await this.db.delete(cartItems).where(and(eq(cartItems.cartItemId, cartItemId), eq(cartItems.userId, userId)));
    return { success: true };
  }

  async clear(userId: string) {
    await this.db.delete(cartItems).where(eq(cartItems.userId, userId));
    return { success: true };
  }
}
