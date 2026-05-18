import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, like, desc, sql } from 'drizzle-orm';
import { companies, users } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

const MAX_PAGE_LIMIT = 50;
const MAX_COMPANY_USERS = 50;

@Injectable()
export class CompaniesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(filters?: { search?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 10, MAX_PAGE_LIMIT);
    const offset = (page - 1) * limit;

    const whereClause = filters?.search ? like(companies.name, `%${filters.search}%`) : undefined;

    const [allCompanies, total] = await Promise.all([
      this.db
        .select()
        .from(companies)
        .where(whereClause)
        .orderBy(desc(companies.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(companies)
        .where(whereClause),
    ]);

    const totalCount = Number(total[0]?.count || 0);

    return {
      data: allCompanies,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async findOne(id: string) {
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.companyId, id))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Get admins
    const admins = await this.db
      .select({
        id: users.userId,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.companyId, id))
      .orderBy(desc(users.createdAt), desc(users.userId))
      .limit(MAX_COMPANY_USERS);

    return {
      ...company,
      admins,
    };
  }

  async create(dto: CreateCompanyDto, userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can create companies');
    }

    const [newCompany] = await this.db
      .insert(companies)
      .values(dto)
      .returning({ companyId: companies.companyId });

    return this.findOne(newCompany.companyId);
  }

  async update(id: string, dto: UpdateCompanyDto, userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can update companies');
    }

    const [updated] = await this.db
      .update(companies)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(companies.companyId, id))
      .returning({ companyId: companies.companyId });

    return this.findOne(updated.companyId);
  }

  async delete(id: string, userRole: string) {
    if (userRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform admins can delete companies');
    }

    await this.db.delete(companies).where(eq(companies.companyId, id));

    return { message: 'Company deleted successfully' };
  }
}

