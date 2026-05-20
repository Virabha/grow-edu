import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CmsService } from './cms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';
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
import { Public } from '../auth/decorators/public.decorator';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==================== BANNERS (public + admin) ====================

  @Get('banners')
  @Public()
  @ApiOperation({ summary: 'Get active banners (public)' })
  @ApiResponse({ status: 200, description: 'List of active banners' })
  getBanners() {
    return this.cmsService.getBanners();
  }

  @Get('banners/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all banners (admin)' })
  getAllBannersAdmin() {
    return this.cmsService.getAllBannersAdmin();
  }

  @Get('banners/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get banner by ID (admin)' })
  getBannerById(@Param('id') id: string) {
    return this.cmsService.getBannerById(id);
  }

  @Post('banners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create banner (admin)' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.cmsService.createBanner(dto);
  }

  @Put('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update banner (admin)' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.cmsService.updateBanner(id, dto);
  }

  @Patch('banners/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate banner (admin)' })
  activateBanner(@Param('id') id: string) {
    return this.cmsService.activateBanner(id);
  }

  @Patch('banners/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate banner (admin)' })
  deactivateBanner(@Param('id') id: string) {
    return this.cmsService.deactivateBanner(id);
  }

  @Delete('banners/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete banner (admin)' })
  deleteBanner(@Param('id') id: string) {
    return this.cmsService.deleteBanner(id);
  }

  // ==================== FAQS (public + admin) ====================

  @Get('faqs')
  @Public()
  @ApiOperation({ summary: 'Get active FAQs (public)' })
  @ApiResponse({ status: 200, description: 'List of active FAQs' })
  getFaqs() {
    return this.cmsService.getFaqs();
  }

  @Get('faqs/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all FAQs (admin)' })
  getAllFaqsAdmin() {
    return this.cmsService.getAllFaqsAdmin();
  }

  @Get('faqs/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getFaqById(@Param('id') id: string) {
    return this.cmsService.getFaqById(id);
  }

  @Post('faqs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  createFaq(@Body() dto: CreateFaqDto) {
    return this.cmsService.createFaq(dto);
  }

  @Put('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  deleteFaq(@Param('id') id: string) {
    return this.cmsService.deleteFaq(id);
  }

  // ==================== WHY CHOOSE US (public + admin) ====================

  @Get('why-choose-us')
  @Public()
  @ApiOperation({ summary: 'Get active why choose us (public)' })
  getWhyChooseUs() {
    return this.cmsService.getWhyChooseUs();
  }

  @Get('why-choose-us/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getAllWhyChooseUsAdmin() {
    return this.cmsService.getAllWhyChooseUsAdmin();
  }

  @Get('why-choose-us/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getWhyChooseUsById(@Param('id') id: string) {
    return this.cmsService.getWhyChooseUsById(id);
  }

  @Post('why-choose-us')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  createWhyChooseUs(@Body() dto: CreateWhyChooseUsDto) {
    return this.cmsService.createWhyChooseUs(dto);
  }

  @Put('why-choose-us/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  updateWhyChooseUs(@Param('id') id: string, @Body() dto: UpdateWhyChooseUsDto) {
    return this.cmsService.updateWhyChooseUs(id, dto);
  }

  @Delete('why-choose-us/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  deleteWhyChooseUs(@Param('id') id: string) {
    return this.cmsService.deleteWhyChooseUs(id);
  }

  // ==================== TESTIMONIALS (public + admin) ====================

  @Get('testimonials')
  @Public()
  @ApiOperation({ summary: 'Get active testimonials (public)' })
  getTestimonials() {
    return this.cmsService.getTestimonials();
  }

  @Get('testimonials/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getAllTestimonialsAdmin() {
    return this.cmsService.getAllTestimonialsAdmin();
  }

  @Get('testimonials/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getTestimonialById(@Param('id') id: string) {
    return this.cmsService.getTestimonialById(id);
  }

  @Post('testimonials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  createTestimonial(@Body() dto: CreateTestimonialDto) {
    return this.cmsService.createTestimonial(dto);
  }

  @Put('testimonials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  updateTestimonial(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.cmsService.updateTestimonial(id, dto);
  }

  @Delete('testimonials/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  deleteTestimonial(@Param('id') id: string) {
    return this.cmsService.deleteTestimonial(id);
  }

  // ==================== SERVICES (public + admin) ====================

  @Get('services')
  @Public()
  @ApiOperation({ summary: 'Get active services (public)' })
  getServices() {
    return this.cmsService.getServices();
  }

  @Get('services/slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get service by slug (public)' })
  getServiceBySlug(@Param('slug') slug: string) {
    return this.cmsService.getServiceBySlug(slug);
  }

  @Get('services/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getAllServicesAdmin() {
    return this.cmsService.getAllServicesAdmin();
  }

  @Get('services/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getServiceById(@Param('id') id: string) {
    return this.cmsService.getServiceById(id);
  }

  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  createService(@Body() dto: CreateServiceDto) {
    return this.cmsService.createService(dto);
  }

  @Put('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.cmsService.updateService(id, dto);
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  deleteService(@Param('id') id: string) {
    return this.cmsService.deleteService(id);
  }

  // ==================== SERVICE APPLICATIONS (public + admin) ====================

  @Post('services/:serviceId/applications')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Submit a service application (public)' })
  submitServiceApplication(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateServiceApplicationDto,
  ) {
    return this.cmsService.submitServiceApplication({ ...dto, serviceId });
  }

  @Get('service-applications/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all service applications (admin)' })
  getAllServiceApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('serviceId') serviceId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.cmsService.getAllServiceApplications({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      serviceId,
      status,
      search,
    });
  }

  @Get('service-applications/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single service application (admin)' })
  getServiceApplicationById(@Param('id') id: string) {
    return this.cmsService.getServiceApplicationById(id);
  }

  @Patch('service-applications/admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service application status (admin)' })
  updateServiceApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.cmsService.updateServiceApplicationStatus(id, dto);
  }

  @Delete('service-applications/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service application (admin)' })
  deleteServiceApplication(@Param('id') id: string) {
    return this.cmsService.deleteServiceApplication(id);
  }

  // ==================== SITE SETTINGS (public + admin) ====================

  @Get('instructors')
  @Public()
  @ApiOperation({ summary: 'Get active instructors (public)' })
  @ApiResponse({ status: 200, description: 'List of instructors' })
  getInstructors() {
    return this.cmsService.getInstructors();
  }

  @Get('site-settings')
  @Public()
  @ApiOperation({ summary: 'Get all site settings as key-value (public)' })
  getAllSiteSettings() {
    return this.cmsService.getAllSiteSettings();
  }

  @Get('site-settings/admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  getAllSiteSettingsAdmin() {
    return this.cmsService.getAllSiteSettingsAdmin();
  }

  @Get('site-settings/:key')
  @Public()
  @ApiOperation({ summary: 'Get site setting by key (public)' })
  getSiteSetting(@Param('key') key: string) {
    return this.cmsService.getSiteSetting(key);
  }

  @Post('site-settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  upsertSiteSetting(@Body() dto: UpsertSiteSettingDto) {
    return this.cmsService.upsertSiteSetting(dto);
  }

  @Delete('site-settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiBearerAuth()
  deleteSiteSetting(@Param('key') key: string) {
    return this.cmsService.deleteSiteSetting(key);
  }
}
