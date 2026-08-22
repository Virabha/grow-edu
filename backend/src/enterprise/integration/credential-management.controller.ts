import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { IntegrationApiService } from "./integration-api.service";
import { IssueCredentialDto } from "./dto/issue-credential.dto";

@Controller("enterprise/credentials")
export class CredentialManagementController {
  constructor(private readonly service: IntegrationApiService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @Post()
  issueCredential(
    @Body() dto: IssueCredentialDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.issueCredential(dto, user.userId);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(":credentialId")
  revokeCredential(
    @Param("credentialId") credentialId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.revokeCredential(credentialId, user.userId);
  }
}
