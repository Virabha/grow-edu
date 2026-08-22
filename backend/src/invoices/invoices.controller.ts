import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Authenticated } from "../auth/decorators/authenticated.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { IssueCreditNoteDto } from "./dto/issue-credit-note.dto";
import { InvoicesService } from "./invoices.service";

interface AuthedUser {
  userId: string;
  role: string;
}

@ApiTags("invoices")
@ApiBearerAuth()
@Controller()
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Authenticated()
  @ApiOperation({ summary: "List the caller's own invoices and credit notes" })
  @Get("invoices")
  listMine(@CurrentUser() user: AuthedUser) {
    return this.invoices.listForUser(user.userId);
  }

  @Authenticated()
  @ApiOperation({ summary: "Get one invoice the caller is entitled to see" })
  @Get("invoices/:invoiceId")
  getOne(
    @Param("invoiceId") invoiceId: string,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.invoices.getOne(invoiceId, user);
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Admin: the whole invoice ledger in issue order" })
  @Get("admin/invoices")
  listAll() {
    return this.invoices.listAll();
  }

  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: "Admin: correct an invoice by issuing a credit note" })
  @Post("admin/invoices/:invoiceId/credit-note")
  creditNote(
    @Param("invoiceId") invoiceId: string,
    @Body() dto: IssueCreditNoteDto,
    @CurrentUser() user: AuthedUser,
  ) {
    return this.invoices.issueCreditNote(invoiceId, dto, user.userId);
  }
}
