import { PartialType } from '@nestjs/swagger';
import { CreateSiteLanguageDto } from './create-site-language.dto';

export class UpdateSiteLanguageDto extends PartialType(CreateSiteLanguageDto) {}
