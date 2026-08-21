import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { DiagnosticService } from "./diagnostic.service";
import { RecordDiagnosticDto } from "./dto/diagnostic.dto";

interface AuthedUser {
  userId: string;
}

@ApiTags("diagnostic")
@ApiBearerAuth()
@Controller("diagnostic")
export class DiagnosticController {
  constructor(private readonly diagnostic: DiagnosticService) {}

  @Authenticated()
  @ApiOperation({ summary: "The placement test set up for my goal" })
  @Get("test")
  test(@CurrentUser() user: AuthedUser) {
    return this.diagnostic.testForViewer(user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Turn a graded placement attempt into a level" })
  @Post("results")
  record(
    @Body() dto: RecordDiagnosticDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.diagnostic.recordResult(user.userId, dto.attemptId);
  }

  @Authenticated()
  @ApiOperation({ summary: "My placement level and what it means" })
  @Get("me")
  me(@CurrentUser() user: AuthedUser) {
    return this.diagnostic.currentFor(user.userId);
  }
}
