import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";
import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { BrandingService } from "./branding.service";
import { ConfigureBrandingDto } from "./dto/configure-branding.dto";

@Controller("enterprise/branding")
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Put(":companyId")
  async configure(
    @Param("companyId") companyId: string,
    @Body() dto: ConfigureBrandingDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    await this.brandingService.configure(companyId, dto, user.userId, user.role);
    return { configured: true };
  }

  @Authenticated()
  @Get("mine")
  async getMyBranding(@CurrentUser() user: { userId: string }) {
    return this.brandingService.getBrandingForUser(user.userId);
  }

  @Public()
  @Get(":companyId")
  async getBrandingForCompany(@Param("companyId") companyId: string) {
    return this.brandingService.getBrandingForCompany(companyId);
  }
}
