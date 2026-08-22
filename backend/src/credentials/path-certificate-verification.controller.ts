import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PathCertificateIssuanceService } from "./path-certificate-issuance.service";

@ApiTags("verify")
@Controller("verify/path-certificates")
export class PathCertificateVerificationController {
  constructor(
    private readonly issuance: PathCertificateIssuanceService,
  ) {}

  @Public()
  @Get(":verificationCode")
  async verify(@Param("verificationCode") verificationCode: string) {
    const result = await this.issuance.verify(verificationCode);
    if (!result) throw new NotFoundException();
    return result;
  }
}
