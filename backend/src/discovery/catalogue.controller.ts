import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CatalogueService } from './catalogue.service';
import { CatalogueFilterDto } from './dto/catalogue-filter.dto';

interface OptionalUser { userId?: string; }

@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() filter: CatalogueFilterDto, @CurrentUser() user?: OptionalUser) {
    return this.catalogueService.list(filter, user ?? {});
  }
}
