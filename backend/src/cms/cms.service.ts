import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, asc, desc, or, ilike, count } from 'drizzle-orm';
import {
  banners,
  faqs,
  whyChooseUs,
  testimonials,
  siteSettings,
  services,
  serviceApplications,
  applicationStatusEnum,
  instructorProfiles,
  users,
} from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { CreateWhyChooseUsDto } from './dto/create-why-choose-us.dto';
import { UpdateWhyChooseUsDto } from './dto/update-why-choose-us.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertSiteSettingDto } from './dto/upsert-site-setting.dto';
import { CreateServiceApplicationDto } from './dto/create-service-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { CacheService } from '../cache/cache.service';
import { StorageService } from '../storage/storage.service';

const CACHE_TTL_BANNERS = 300;
const CACHE_TTL_FAQS = 300;
const CACHE_TTL_WHY = 300;
const CACHE_TTL_TESTIMONIALS = 300;
const CACHE_TTL_SERVICES = 300;
const CACHE_TTL_SETTINGS = 300;

@Injectable()
export class CmsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly cache: CacheService,
    private readonly storageService: StorageService,
  ) {}

  /** Resolve a storage key to a full CDN URL. */
  private resolveUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    try { return this.storageService.getCdnUrl(url); } catch { return url; }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ==================== BANNERS ====================

  private resolveBannerUrls<T extends { imageUrl: string }>(rows: T[]): T[] {
    return rows.map((r) => ({ ...r, imageUrl: this.resolveUrl(r.imageUrl) ?? r.imageUrl }));
  }

  async getBanners() {
    const cached = await this.cache.get<(typeof banners.$inferSelect)[]>('cms:banners:public');
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.displayOrder), asc(banners.createdAt));
    const resolved = this.resolveBannerUrls(rows);
    await this.cache.set('cms:banners:public', resolved, CACHE_TTL_BANNERS);
    return resolved;
  }

  async getAllBannersAdmin() {
    const rows = await this.db
      .select()
      .from(banners)
      .orderBy(asc(banners.displayOrder), asc(banners.createdAt));
    return this.resolveBannerUrls(rows);
  }

  async getBannerById(id: string) {
    const [row] = await this.db
      .select()
      .from(banners)
      .where(eq(banners.bannerId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Banner ${id} not found`);
    return { ...row, imageUrl: this.resolveUrl(row.imageUrl) ?? row.imageUrl };
  }

  private async invalidateBanners() { await this.cache.delByPrefix('cms:banners'); }

  async createBanner(dto: CreateBannerDto) {
    const [row] = await this.db
      .insert(banners)
      .values({
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl,
        overlayColor: dto.overlayColor ?? "rgba(0,0,0,0.4)",
        overlayOpacity: dto.overlayOpacity ?? 40,
        textColor: dto.textColor ?? "#ffffff",
        textAlign: dto.textAlign ?? "left",
        ctaText: dto.ctaText ?? null,
        ctaLink: dto.ctaLink ?? null,
        ctaStyle: dto.ctaStyle ?? "primary",
        secondaryCtaText: dto.secondaryCtaText ?? null,
        secondaryCtaLink: dto.secondaryCtaLink ?? null,
        badgeText: dto.badgeText ?? null,
        badgeColor: dto.badgeColor ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    await this.invalidateBanners();
    return row;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    await this.getBannerById(id);
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const fields = [
      "title", "subtitle", "description", "imageUrl",
      "overlayColor", "overlayOpacity", "textColor", "textAlign",
      "ctaText", "ctaLink", "ctaStyle",
      "secondaryCtaText", "secondaryCtaLink",
      "badgeText", "badgeColor", "displayOrder", "isActive",
    ] as const;
    for (const key of fields) {
      if ((dto as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (dto as Record<string, unknown>)[key];
      }
    }
    const [row] = await this.db
      .update(banners)
      .set(updates)
      .where(eq(banners.bannerId, id))
      .returning();
    await this.invalidateBanners();
    return row;
  }

  async activateBanner(id: string) {
    await this.getBannerById(id);
    await this.db
      .update(banners)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(banners.bannerId, id));
    await this.invalidateBanners();
    return { bannerId: id, isActive: true, message: 'Banner activated' };
  }

  async deactivateBanner(id: string) {
    await this.getBannerById(id);
    await this.db
      .update(banners)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(banners.bannerId, id));
    await this.invalidateBanners();
    return { bannerId: id, isActive: false, message: 'Banner deactivated' };
  }

  async deleteBanner(id: string) {
    await this.getBannerById(id);
    await this.db.delete(banners).where(eq(banners.bannerId, id));
    await this.invalidateBanners();
    return { deleted: true, bannerId: id };
  }

  // ==================== FAQS ====================

  async getFaqs() {
    const cached = await this.cache.get<(typeof faqs.$inferSelect)[]>('cms:faqs:public');
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(faqs)
      .where(eq(faqs.isActive, true))
      .orderBy(asc(faqs.displayOrder), asc(faqs.createdAt));
    await this.cache.set('cms:faqs:public', rows, CACHE_TTL_FAQS);
    return rows;
  }

  private async invalidateFaqs() { await this.cache.delByPrefix('cms:faqs'); }

  async getAllFaqsAdmin() {
    return this.db
      .select()
      .from(faqs)
      .orderBy(asc(faqs.displayOrder), asc(faqs.createdAt));
  }

  async getFaqById(id: string) {
    const [row] = await this.db
      .select()
      .from(faqs)
      .where(eq(faqs.faqId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`FAQ ${id} not found`);
    return row;
  }

  async createFaq(dto: CreateFaqDto) {
    const [row] = await this.db
      .insert(faqs)
      .values({
        question: dto.question,
        answer: dto.answer,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    await this.invalidateFaqs();
    return row;
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    await this.getFaqById(id);
    const [row] = await this.db
      .update(faqs)
      .set({
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(faqs.faqId, id))
      .returning();
    await this.invalidateFaqs();
    return row;
  }

  async deleteFaq(id: string) {
    await this.getFaqById(id);
    await this.db.delete(faqs).where(eq(faqs.faqId, id));
    await this.invalidateFaqs();
    return { deleted: true, faqId: id };
  }

  // ==================== WHY CHOOSE US ====================

  private async invalidateWhy() { await this.cache.delByPrefix('cms:why'); }

  async getWhyChooseUs() {
    const cached = await this.cache.get<(typeof whyChooseUs.$inferSelect)[]>('cms:why:public');
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(whyChooseUs)
      .where(eq(whyChooseUs.isActive, true))
      .orderBy(asc(whyChooseUs.displayOrder), asc(whyChooseUs.createdAt));
    await this.cache.set('cms:why:public', rows, CACHE_TTL_WHY);
    return rows;
  }

  async getAllWhyChooseUsAdmin() {
    return this.db
      .select()
      .from(whyChooseUs)
      .orderBy(asc(whyChooseUs.displayOrder), asc(whyChooseUs.createdAt));
  }

  async getWhyChooseUsById(id: string) {
    const [row] = await this.db
      .select()
      .from(whyChooseUs)
      .where(eq(whyChooseUs.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Why choose us item ${id} not found`);
    return row;
  }

  async createWhyChooseUs(dto: CreateWhyChooseUsDto) {
    const [row] = await this.db
      .insert(whyChooseUs)
      .values({
        iconName: dto.iconName,
        iconColor: dto.iconColor ?? null,
        iconBg: dto.iconBg ?? null,
        title: dto.title,
        description: dto.description ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    await this.invalidateWhy();
    return row;
  }

  async updateWhyChooseUs(id: string, dto: UpdateWhyChooseUsDto) {
    await this.getWhyChooseUsById(id);
    const [row] = await this.db
      .update(whyChooseUs)
      .set({
        ...(dto.iconName !== undefined && { iconName: dto.iconName }),
        ...(dto.iconColor !== undefined && { iconColor: dto.iconColor }),
        ...(dto.iconBg !== undefined && { iconBg: dto.iconBg }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(whyChooseUs.id, id))
      .returning();
    await this.invalidateWhy();
    return row;
  }

  async deleteWhyChooseUs(id: string) {
    await this.getWhyChooseUsById(id);
    await this.db.delete(whyChooseUs).where(eq(whyChooseUs.id, id));
    await this.invalidateWhy();
    return { deleted: true, id };
  }

  // ==================== TESTIMONIALS ====================

  private async invalidateTestimonials() { await this.cache.delByPrefix('cms:testimonials'); }

  async getTestimonials() {
    const cached = await this.cache.get<(typeof testimonials.$inferSelect)[]>('cms:testimonials:public');
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isActive, true))
      .orderBy(asc(testimonials.displayOrder), asc(testimonials.createdAt));
    await this.cache.set('cms:testimonials:public', rows, CACHE_TTL_TESTIMONIALS);
    return rows;
  }

  async getAllTestimonialsAdmin() {
    return this.db
      .select()
      .from(testimonials)
      .orderBy(asc(testimonials.displayOrder), asc(testimonials.createdAt));
  }

  async getTestimonialById(id: string) {
    const [row] = await this.db
      .select()
      .from(testimonials)
      .where(eq(testimonials.testimonialId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Testimonial ${id} not found`);
    return row;
  }

  async createTestimonial(dto: CreateTestimonialDto) {
    const [row] = await this.db
      .insert(testimonials)
      .values({
        name: dto.name,
        role: dto.role ?? null,
        company: dto.company ?? null,
        rating: dto.rating ?? 5,
        text: dto.text,
        course: dto.course ?? null,
        avatarUrl: dto.avatarUrl ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    await this.invalidateTestimonials();
    return row;
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto) {
    await this.getTestimonialById(id);
    const [row] = await this.db
      .update(testimonials)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.course !== undefined && { course: dto.course }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(testimonials.testimonialId, id))
      .returning();
    await this.invalidateTestimonials();
    return row;
  }

  async deleteTestimonial(id: string) {
    await this.getTestimonialById(id);
    await this.db.delete(testimonials).where(eq(testimonials.testimonialId, id));
    await this.invalidateTestimonials();
    return { deleted: true, testimonialId: id };
  }

  // ==================== SERVICES ====================

  private async invalidateServices() { await this.cache.delByPrefix('cms:services'); }

  private resolveServiceUrls<T extends { imageUrl: string | null; screenshots: string[] | null }>(rows: T[]): T[] {
    return rows.map((r) => ({
      ...r,
      imageUrl: this.resolveUrl(r.imageUrl),
      screenshots: (r.screenshots ?? []).map((s) => this.resolveUrl(s) ?? s),
    }));
  }

  async getServices() {
    const cached = await this.cache.get<(typeof services.$inferSelect)[]>('cms:services:public');
    if (cached) return cached;
    const rows = await this.db
      .select()
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.displayOrder), asc(services.createdAt));
    const resolved = this.resolveServiceUrls(rows);
    await this.cache.set('cms:services:public', resolved, CACHE_TTL_SERVICES);
    return resolved;
  }

  async getAllServicesAdmin() {
    const rows = await this.db
      .select()
      .from(services)
      .orderBy(asc(services.displayOrder), asc(services.createdAt));
    return this.resolveServiceUrls(rows);
  }

  async getServiceById(id: string) {
    const [row] = await this.db
      .select()
      .from(services)
      .where(eq(services.serviceId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Service ${id} not found`);
    return {
      ...row,
      imageUrl: this.resolveUrl(row.imageUrl),
      screenshots: (row.screenshots ?? []).map((s) => this.resolveUrl(s) ?? s),
    };
  }

  async getServiceBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.slug, slug), eq(services.isActive, true)))
      .limit(1);
    if (!row) throw new NotFoundException(`Service ${slug} not found`);
    return {
      ...row,
      imageUrl: this.resolveUrl(row.imageUrl),
      screenshots: (row.screenshots ?? []).map((s) => this.resolveUrl(s) ?? s),
    };
  }

  async createService(dto: CreateServiceDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    const [existing] = await this.db
      .select()
      .from(services)
      .where(eq(services.slug, slug))
      .limit(1);
    if (existing) throw new ConflictException('Service with this slug already exists');
    const [row] = await this.db
      .insert(services)
      .values({
        title: dto.title,
        slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        screenshots: dto.screenshots ?? [],
        iconName: dto.iconName ?? null,
        formSchema: dto.formSchema ?? null,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    await this.invalidateServices();
    return row;
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    await this.getServiceById(id);
    const newSlug = dto.slug ?? (dto.title ? this.generateSlug(dto.title) : null);
    if (newSlug) {
      const [duplicate] = await this.db
        .select()
        .from(services)
        .where(eq(services.slug, newSlug))
        .limit(1);
      if (duplicate && duplicate.serviceId !== id)
        throw new ConflictException('Service with this slug already exists');
    }
    const [row] = await this.db
      .update(services)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.screenshots !== undefined && { screenshots: dto.screenshots }),
        ...(dto.iconName !== undefined && { iconName: dto.iconName }),
        ...(dto.formSchema !== undefined && { formSchema: dto.formSchema }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(services.serviceId, id))
      .returning();
    await this.invalidateServices();
    return row;
  }

  async deleteService(id: string) {
    await this.getServiceById(id);
    await this.db.delete(services).where(eq(services.serviceId, id));
    await this.invalidateServices();
    return { deleted: true, serviceId: id };
  }

  // ==================== SERVICE APPLICATIONS ====================

  private extractApplicantInfoFromFormData(formData: Record<string, unknown>) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d\s+\-().]{7,20}$/;
    let name = '';
    let email = '';
    let phone = '';

    for (const [key, val] of Object.entries(formData)) {
      if (typeof val !== 'string' || !val.trim()) continue;
      const k = key.toLowerCase();
      if (!email && (k.includes('email') || k.includes('e_mail') || emailRegex.test(val))) {
        email = val;
      }
      if (!phone && (k.includes('phone') || k.includes('mobile') || k.includes('tel') || k.includes('contact_number'))) {
        phone = val;
      }
      if (!name && (k.includes('name') || k.includes('full_name') || k.includes('fullname')) && !k.includes('email') && !k.includes('user')) {
        name = val;
      }
    }

    // Fallback: scan all values for email pattern if not found by key
    if (!email) {
      for (const val of Object.values(formData)) {
        if (typeof val === 'string' && emailRegex.test(val.trim())) {
          email = val.trim();
          break;
        }
      }
    }

    // Fallback: use first non-empty string value as name
    if (!name) {
      for (const val of Object.values(formData)) {
        if (typeof val === 'string' && val.trim() && !emailRegex.test(val) && !phoneRegex.test(val)) {
          name = val.trim();
          break;
        }
      }
    }

    return { name: name || 'Unknown', email: email || 'unknown@unknown.com', phone };
  }

  async submitServiceApplication(dto: CreateServiceApplicationDto) {
    const [service] = await this.db
      .select()
      .from(services)
      .where(eq(services.serviceId, dto.serviceId))
      .limit(1);
    if (!service) throw new NotFoundException(`Service ${dto.serviceId} not found`);

    const extracted = this.extractApplicantInfoFromFormData(dto.formData);
    const applicantName = dto.applicantName?.trim() || extracted.name;
    const applicantEmail = dto.applicantEmail?.trim() || extracted.email;
    const applicantPhone = dto.applicantPhone?.trim() || extracted.phone || null;

    const [row] = await this.db
      .insert(serviceApplications)
      .values({
        serviceId: dto.serviceId,
        formData: dto.formData as Record<string, unknown>,
        applicantName,
        applicantEmail,
        applicantPhone,
      })
      .returning();
    return row;
  }

  async getAllServiceApplications(params: {
    page: number;
    limit: number;
    serviceId?: string;
    status?: string;
    search?: string;
  }) {
    const { page, limit, serviceId, status, search } = params;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (serviceId) conditions.push(eq(serviceApplications.serviceId, serviceId));
    if (status) conditions.push(eq(serviceApplications.status, status as (typeof applicationStatusEnum.enumValues)[number]));
    if (search) {
      const searchCondition = or(
        ilike(serviceApplications.applicantName, `%${search}%`),
        ilike(serviceApplications.applicantEmail, `%${search}%`),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(serviceApplications)
      .where(where);

    const rows = await this.db
      .select({
        applicationId: serviceApplications.applicationId,
        serviceId: serviceApplications.serviceId,
        applicantName: serviceApplications.applicantName,
        applicantEmail: serviceApplications.applicantEmail,
        applicantPhone: serviceApplications.applicantPhone,
        status: serviceApplications.status,
        createdAt: serviceApplications.createdAt,
        updatedAt: serviceApplications.updatedAt,
        serviceTitle: services.title,
      })
      .from(serviceApplications)
      .leftJoin(services, eq(serviceApplications.serviceId, services.serviceId))
      .where(where)
      .orderBy(desc(serviceApplications.createdAt))
      .limit(limit)
      .offset(offset);

    const total = totalResult?.count ?? 0;
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getServiceApplicationById(id: string) {
    const [row] = await this.db
      .select({
        applicationId: serviceApplications.applicationId,
        serviceId: serviceApplications.serviceId,
        formData: serviceApplications.formData,
        applicantName: serviceApplications.applicantName,
        applicantEmail: serviceApplications.applicantEmail,
        applicantPhone: serviceApplications.applicantPhone,
        status: serviceApplications.status,
        adminNotes: serviceApplications.adminNotes,
        createdAt: serviceApplications.createdAt,
        updatedAt: serviceApplications.updatedAt,
        serviceTitle: services.title,
        formSchema: services.formSchema,
      })
      .from(serviceApplications)
      .leftJoin(services, eq(serviceApplications.serviceId, services.serviceId))
      .where(eq(serviceApplications.applicationId, id))
      .limit(1);
    if (!row) throw new NotFoundException(`Service application ${id} not found`);
    return row;
  }

  async updateServiceApplicationStatus(id: string, dto: UpdateApplicationStatusDto) {
    await this.getServiceApplicationById(id);
    const [row] = await this.db
      .update(serviceApplications)
      .set({
        status: dto.status as (typeof applicationStatusEnum.enumValues)[number],
        ...(dto.adminNotes !== undefined && { adminNotes: dto.adminNotes }),
        updatedAt: new Date(),
      })
      .where(eq(serviceApplications.applicationId, id))
      .returning();
    return row;
  }

  async deleteServiceApplication(id: string) {
    await this.getServiceApplicationById(id);
    await this.db.delete(serviceApplications).where(eq(serviceApplications.applicationId, id));
    return { deleted: true, applicationId: id };
  }

  // ==================== SITE SETTINGS ====================

  async getSiteSetting(key: string) {
    const [row] = await this.db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    if (!row) return null;
    return row.value;
  }

  private async invalidateSettings() { await this.cache.delByPrefix('cms:settings'); }

  async getAllSiteSettings() {
    const cached = await this.cache.get<Record<string, unknown>>('cms:settings:all');
    if (cached) return cached;
    const rows = await this.db.select().from(siteSettings);
    const result = rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {} as Record<string, unknown>);
    await this.cache.set('cms:settings:all', result, CACHE_TTL_SETTINGS);
    return result;
  }

  async getAllSiteSettingsAdmin() {
    return this.db.select().from(siteSettings);
  }

  async upsertSiteSetting(dto: UpsertSiteSettingDto) {
    const [row] = await this.db
      .insert(siteSettings)
      .values({
        key: dto.key,
        value: dto.value as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: dto.value as Record<string, unknown>,
          updatedAt: new Date(),
        },
      })
      .returning();
    await this.invalidateSettings();
    return row;
  }

  async deleteSiteSetting(key: string) {
    const result = await this.db
      .delete(siteSettings)
      .where(eq(siteSettings.key, key))
      .returning({ settingId: siteSettings.settingId });
    if (result.length === 0) throw new NotFoundException(`Site setting ${key} not found`);
    await this.invalidateSettings();
    return { deleted: true, key };
  }

  async getInstructors() {
    const rows = await this.db
      .select({
        profileId: instructorProfiles.profileId,
        userId: instructorProfiles.userId,
        bio: instructorProfiles.bio,
        expertise: instructorProfiles.expertise,
        experience: instructorProfiles.experience,
        education: instructorProfiles.education,
        avatarUrl: instructorProfiles.avatarUrl,
        displayOrder: instructorProfiles.displayOrder,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(instructorProfiles)
      .innerJoin(users, eq(instructorProfiles.userId, users.userId))
      .where(eq(instructorProfiles.isActive, true))
      .orderBy(asc(instructorProfiles.displayOrder), asc(users.firstName));
    return rows.map((r) => ({
      profileId: r.profileId,
      userId: r.userId,
      name: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Instructor',
      bio: r.bio,
      expertise: r.expertise ?? [],
      experience: r.experience,
      education: r.education,
      avatarUrl: r.avatarUrl,
      displayOrder: r.displayOrder,
    }));
  }
}
