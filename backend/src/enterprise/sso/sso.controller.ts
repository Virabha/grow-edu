import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Request,
} from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Public } from "../../auth/decorators/public.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { AuthService } from "../../auth/auth.service";
import { SsoService } from "./sso.service";
import { ConfigureSsoDto } from "./dto/configure-sso.dto";
import { SsoSignInDto } from "./dto/sso-sign-in.dto";

@Controller("enterprise/sso")
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly authService: AuthService,
  ) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @Put(":companyId")
  async configure(
    @Param("companyId") companyId: string,
    @Body() dto: ConfigureSsoDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.ssoService.configure(companyId, dto, user.userId);
    return { configured: true };
  }

  @Roles(UserRole.PLATFORM_ADMIN, UserRole.CORPORATE_ADMIN)
  @Get(":companyId")
  async getConfig(
    @Param("companyId") companyId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.ssoService.getConfig(companyId, user.userId, user.role);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(":companyId")
  async deleteConfig(@Param("companyId") companyId: string) {
    await this.ssoService.deleteConfig(companyId);
    return { deleted: true };
  }

  @Public()
  @Post(":companyId/sign-in")
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Param("companyId") companyId: string,
    @Body() dto: SsoSignInDto,
    @Request() req: { headers: Record<string, string>; ip?: string },
  ) {
    const userId = await this.ssoService.signIn(companyId, dto.token);
    const userPayload = await this.authService.payloadFor(userId);
    const deviceId = await this.authService.upsertDevice(
      userPayload,
      req.headers["user-agent"] ?? null,
      req.ip ?? null,
    );
    return this.authService.login(userPayload, deviceId);
  }
}
