import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { SsoController } from "./sso/sso.controller";
import { SsoService } from "./sso/sso.service";
import { SSO_PROVIDER, HttpSsoProvider } from "./sso/sso-provider";
import { ApiCredentialGuard } from "./integration/api-credential.guard";
import { IntegrationApiService } from "./integration/integration-api.service";
import { IntegrationApiController } from "./integration/integration-api.controller";
import { CredentialManagementController } from "./integration/credential-management.controller";
import { BrandingService } from "./branding/branding.service";
import { BrandingController } from "./branding/branding.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    SsoController,
    IntegrationApiController,
    CredentialManagementController,
    BrandingController,
  ],
  providers: [
    { provide: SSO_PROVIDER, useClass: HttpSsoProvider },
    SsoService,
    ApiCredentialGuard,
    IntegrationApiService,
    BrandingService,
  ],
})
export class EnterpriseModule {}
