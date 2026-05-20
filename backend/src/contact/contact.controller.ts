import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('contact')
@Controller('contact')
@Public()
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Submit a contact form (public)' })
  @ApiResponse({ status: 201, description: 'Contact form submitted' })
  create(@Body() dto: CreateContactDto) {
    return this.contactService.create(dto);
  }
}
