import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { CertificateTemplateService } from './certificate-template.service';
import { CertificateTemplateDto } from './dto/certificate-template.dto';

@ApiTags('certificate-template')
@Controller('certificate-template')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
@ApiBearerAuth()
export class CertificateTemplateController {
  constructor(private readonly service: CertificateTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Get the certificate template (admin)' })
  @ApiResponse({ status: 200, type: CertificateTemplateDto })
  get(): Promise<CertificateTemplateDto> {
    return this.service.get();
  }

  @Put()
  @ApiOperation({ summary: 'Save the certificate template (admin)' })
  @ApiResponse({ status: 200, type: CertificateTemplateDto })
  upsert(@Body() dto: CertificateTemplateDto): Promise<CertificateTemplateDto> {
    return this.service.upsert(dto);
  }
}
