import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Public } from "../../auth/decorators/public.decorator";
import { ApiCredentialGuard } from "./api-credential.guard";
import { IntegrationApiService } from "./integration-api.service";

interface ApiRequest {
  apiCompanyId: string;
}

@Public()
@UseGuards(ApiCredentialGuard)
@Controller("enterprise/v1")
export class IntegrationApiController {
  constructor(private readonly service: IntegrationApiService) {}

  @Get("students")
  listStudents(@Request() req: ApiRequest) {
    return this.service.listStudents(req.apiCompanyId);
  }

  @Get("students/:userId/progress")
  getProgress(
    @Param("userId") userId: string,
    @Request() req: ApiRequest,
  ) {
    return this.service.getStudentProgress(req.apiCompanyId, userId);
  }

  @Get("students/:userId/attendance")
  getAttendance(
    @Param("userId") userId: string,
    @Request() req: ApiRequest,
  ) {
    return this.service.getStudentAttendance(req.apiCompanyId, userId);
  }
}
