import { Controller, ForbiddenException, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { InstructorComparisonQueryDto } from "./dto/reporting.dto";
import { InstructorComparisonService } from "./instructor-comparison.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("reporting")
@ApiBearerAuth()
@Controller("reports/instructors")
export class InstructorComparisonController {
  constructor(private readonly comparison: InstructorComparisonService) {}

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Compare instructors on attendance, results, and responsiveness" })
  @Get()
  compare(
    @Query() query: InstructorComparisonQueryDto,
    @CurrentUser() user: AuthedUser,
  ) {
    if (user.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenException();
    }
    return this.comparison.compare({
      fromDate: query.fromDate,
      toDate: query.toDate,
      requestingUserId: user.userId,
      requestingRole: user.role,
    });
  }
}
