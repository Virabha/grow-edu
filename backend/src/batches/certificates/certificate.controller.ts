import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { BatchAccess } from "../access/batch-access.decorator";
import { Roles, UserRole } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { CertificateService } from "./certificate.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("batches")
@ApiBearerAuth()
@Controller("batches")
export class CertificateController {
  constructor(private readonly certificates: CertificateService) {}

  @BatchAccess("READ")
  @ApiOperation({ summary: "Get my certificate metadata for a batch" })
  @Get(":batchId/my-certificate")
  async myCertificate(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return { certificate: await this.certificates.getForUser(batchId, user.userId) };
  }

  @BatchAccess("READ")
  @ApiOperation({ summary: "Download my certificate as PDF" })
  @Get(":batchId/my-certificate/download")
  @Header("Content-Type", "application/pdf")
  async downloadMine(
    @Param("batchId") batchId: string,
    @CurrentUser() user: AuthedUser,
    @Res() res: Response,
  ) {
    const pdf = await this.certificates.renderPdf(batchId, user.userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${batchId}.pdf"`,
    );
    res.send(pdf);
  }

  @ApiOperation({ summary: "List certificates in a batch (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(":batchId/certificates")
  listForBatch(@Param("batchId") batchId: string) {
    return this.certificates.listForBatch(batchId);
  }

  @ApiOperation({ summary: "Issue a certificate to a student (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(":batchId/certificates/:userId")
  issue(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Body() body: { requireCompletion?: boolean },
  ) {
    return this.certificates.issue(batchId, userId, {
      requireCompletion: body?.requireCompletion ?? false,
    });
  }

  @ApiOperation({ summary: "Revoke a certificate (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete(":batchId/certificates/:userId")
  revoke(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @CurrentUser() actor: AuthedUser,
    @Body() body: { reason?: string },
  ) {
    return this.certificates.revoke(batchId, userId, actor.userId, body?.reason);
  }

  @ApiOperation({ summary: "Download a student's certificate (admin)" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Get(":batchId/certificates/:userId/download")
  @Header("Content-Type", "application/pdf")
  async download(
    @Param("batchId") batchId: string,
    @Param("userId") userId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.certificates.renderPdf(batchId, userId);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="certificate-${batchId}-${userId}.pdf"`,
    );
    res.send(pdf);
  }
}
