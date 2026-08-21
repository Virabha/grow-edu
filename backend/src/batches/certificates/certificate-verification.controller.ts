import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/decorators/public.decorator";
import { CertificateService } from "./certificate.service";

@ApiTags("verify")
@Controller("verify/certificates")
export class CertificateVerificationController {
  constructor(private readonly certificates: CertificateService) {}

  @Public()
  @ApiOperation({ summary: "Verify a certificate by its verification code" })
  @Get(":verificationCode")
  async verify(@Param("verificationCode") verificationCode: string) {
    const result = await this.certificates.verify(verificationCode);
    if (!result) throw new NotFoundException();
    return result;
  }
}
