import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { ApplyDto } from "./dto/apply.dto";
import { PostOpeningDto } from "./dto/post-opening.dto";
import { UpdateApplicationStatusDto } from "./dto/update-application-status.dto";
import { JobBoardService } from "./job-board.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("job-board")
@Controller("job-board")
export class JobBoardController {
  constructor(private readonly jobBoard: JobBoardService) {}

  @Roles("PLATFORM_ADMIN")
  @Post("openings")
  postOpening(@Body() dto: PostOpeningDto, @CurrentUser() user: AuthedUser) {
    return this.jobBoard.postOpening(dto, user.userId);
  }

  @Authenticated()
  @Get("openings")
  listOpenings(@CurrentUser() user: AuthedUser) {
    return this.jobBoard.listOpenings(user.role);
  }

  @Authenticated()
  @Get("openings/:openingId")
  getOpening(
    @Param("openingId") openingId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.jobBoard.getOpening(openingId, user.role);
  }

  @Roles("PLATFORM_ADMIN")
  @Delete("openings/:openingId")
  closeOpening(@Param("openingId") openingId: string) {
    return this.jobBoard.closeOpening(openingId);
  }

  @Roles("LEARNER")
  @Post("openings/:openingId/apply")
  apply(
    @Param("openingId") openingId: string,
    @Body() dto: ApplyDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.jobBoard.apply(openingId, dto, user.userId);
  }

  @Authenticated()
  @Get("applications")
  listApplications(@CurrentUser() user: AuthedUser) {
    return this.jobBoard.listApplications(user.userId, user.role);
  }

  @Roles("PLATFORM_ADMIN")
  @Patch("applications/:applicationId")
  updateApplicationStatus(
    @Param("applicationId") applicationId: string,
    @Body() dto: UpdateApplicationStatusDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.jobBoard.updateApplicationStatus(
      applicationId,
      dto,
      user.userId,
    );
  }

  @Roles("PLATFORM_ADMIN")
  @Get("applications/:applicationId/portfolio")
  getApplicationPortfolio(@Param("applicationId") applicationId: string) {
    return this.jobBoard.getApplicationPortfolio(applicationId);
  }
}
