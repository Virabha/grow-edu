import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { landingPages, PageBlock } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CLOCK, Clock } from '../common/clock';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

const BLOCK_PALETTE = [
  'HERO',
  'FEATURES',
  'TESTIMONIALS',
  'PRICING',
  'FAQ',
  'CTA',
  'TEXT',
  'IMAGE',
] as const;

type BlockKind = (typeof BLOCK_PALETTE)[number];

function isBlockKind(value: unknown): value is BlockKind {
  return typeof value === 'string' && (BLOCK_PALETTE as readonly string[]).includes(value);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateStructuredData(data: Record<string, unknown>): void {
  if (!data['@context'] || !data['@type']) {
    throw new UnprocessableEntityException(
      'Structured data must include @context and @type',
    );
  }
  const context = data['@context'];
  if (typeof context !== 'string' && typeof context !== 'object') {
    throw new UnprocessableEntityException('@context must be a string or object');
  }
  const type = data['@type'];
  if (typeof type !== 'string' && !Array.isArray(type)) {
    throw new UnprocessableEntityException('@type must be a string or array');
  }
}

function parseAndValidateBlocks(raw: unknown): PageBlock[] {
  if (!Array.isArray(raw)) {
    throw new BadRequestException('blocks must be an array');
  }
  const result: PageBlock[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      throw new BadRequestException('Each block must be an object');
    }
    const block = item as Record<string, unknown>;
    if (!isBlockKind(block['kind'])) {
      throw new BadRequestException(
        `Block kind "${String(block['kind'])}" is not in the palette. Allowed: ${BLOCK_PALETTE.join(', ')}`,
      );
    }
    result.push({
      kind: block['kind'],
      displayOrder: typeof block['displayOrder'] === 'number' ? block['displayOrder'] : 0,
      visible: block['visible'] !== false,
      config: typeof block['config'] === 'object' && block['config'] !== null
        ? (block['config'] as Record<string, unknown>)
        : {},
    });
  }
  return result;
}

type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class PageBuilderService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Db,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async listPages() {
    return this.db.select().from(landingPages).orderBy(landingPages.createdAt);
  }

  async getPage(id: string) {
    const [row] = await this.db
      .select()
      .from(landingPages)
      .where(eq(landingPages.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Page ${id} not found`);
    return row;
  }

  async getPublicPageBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(landingPages)
      .where(and(eq(landingPages.slug, slug), eq(landingPages.status, 'PUBLISHED')))
      .limit(1);
    if (!row) throw new NotFoundException(`Page "${slug}" not found`);
    return row;
  }

  async createPage(dto: CreatePageDto, rawBlocks: unknown[]) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);

    const [conflict] = await this.db
      .select({ id: landingPages.id })
      .from(landingPages)
      .where(eq(landingPages.slug, slug))
      .limit(1);
    if (conflict) throw new ConflictException(`A page with slug "${slug}" already exists`);

    if (dto.structuredData) validateStructuredData(dto.structuredData);

    const blocks = rawBlocks !== undefined && rawBlocks !== null ? parseAndValidateBlocks(rawBlocks) : [];

    const [row] = await this.db
      .insert(landingPages)
      .values({
        slug,
        title: dto.title,
        blocks,
        metaTitle: dto.metaTitle ?? null,
        metaDescription: dto.metaDescription ?? null,
        canonicalUrl: dto.canonicalUrl ?? null,
        ogImageUrl: dto.ogImageUrl ?? null,
        structuredData: dto.structuredData ?? null,
      })
      .returning();
    return row;
  }

  async updatePage(id: string, dto: UpdatePageDto, rawBlocks: unknown[] | undefined) {
    await this.getPage(id);

    if (dto.slug !== undefined) {
      const normalized = slugify(dto.slug);
      const [conflict] = await this.db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(eq(landingPages.slug, normalized))
        .limit(1);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`A page with slug "${normalized}" already exists`);
      }
    }

    if (dto.structuredData) validateStructuredData(dto.structuredData);

    const blocks = rawBlocks !== undefined && rawBlocks !== null ? parseAndValidateBlocks(rawBlocks) : undefined;

    const [row] = await this.db
      .update(landingPages)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: slugify(dto.slug) }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.canonicalUrl !== undefined && { canonicalUrl: dto.canonicalUrl }),
        ...(dto.ogImageUrl !== undefined && { ogImageUrl: dto.ogImageUrl }),
        ...(dto.structuredData !== undefined && { structuredData: dto.structuredData }),
        ...(blocks !== undefined && { blocks }),
        updatedAt: this.clock.now(),
      })
      .where(eq(landingPages.id, id))
      .returning();
    return row;
  }

  async publishPage(id: string) {
    const page = await this.getPage(id);
    if (page.status === 'PUBLISHED') return page;
    const now = this.clock.now();
    const [row] = await this.db
      .update(landingPages)
      .set({ status: 'PUBLISHED', publishedAt: now, updatedAt: now })
      .where(eq(landingPages.id, id))
      .returning();
    return row;
  }

  async unpublishPage(id: string) {
    const page = await this.getPage(id);
    if (page.status === 'DRAFT') return page;
    const now = this.clock.now();
    const [row] = await this.db
      .update(landingPages)
      .set({ status: 'DRAFT', publishedAt: null, updatedAt: now })
      .where(eq(landingPages.id, id))
      .returning();
    return row;
  }

  async deletePage(id: string) {
    await this.getPage(id);
    await this.db.delete(landingPages).where(eq(landingPages.id, id));
    return { deleted: true, id };
  }

  getPalette() {
    return { kinds: [...BLOCK_PALETTE] };
  }
}
