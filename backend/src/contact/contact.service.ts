import { Injectable, Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { contactSubmissions } from '../database/schema';
import { DATABASE_CONNECTION } from '../database/database.module';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(dto: CreateContactDto) {
    const [row] = await this.db
      .insert(contactSubmissions)
      .values({
        name: dto.name,
        email: dto.email,
        mobile: dto.mobile,
        subject: dto.subject,
        courseInterested: dto.courseInterested,
        role: dto.role,
        message: dto.message,
        documentUrl: dto.documentUrl,
      })
      .returning();
    return row;
  }
}
