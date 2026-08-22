import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { ListNotebookDto } from "./dto/notebook.dto";
import { ErrorNotebookService } from "./error-notebook.service";

interface AuthedUser {
  userId: string;
}

@ApiTags("assessment")
@ApiBearerAuth()
@Controller("assessment/error-notebook")
@Authenticated()
export class ErrorNotebookController {
  constructor(private readonly notebook: ErrorNotebookService) {}

  @ApiOperation({ summary: "Every question I have got wrong" })
  @Get()
  list(@Query() query: ListNotebookDto, @CurrentUser() user: AuthedUser) {
    return this.notebook.list(user.userId, query);
  }

  @ApiOperation({ summary: "Mark an entry resolved" })
  @Post(":entryId/resolve")
  resolve(
    @Param("entryId") entryId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.notebook.resolve(entryId, user.userId);
  }

  @ApiOperation({ summary: "Put a resolved entry back on the active list" })
  @Post(":entryId/reopen")
  reopen(@Param("entryId") entryId: string, @CurrentUser() user: AuthedUser) {
    return this.notebook.reopen(entryId, user.userId);
  }
}
