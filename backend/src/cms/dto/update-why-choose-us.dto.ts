import { PartialType } from '@nestjs/swagger';
import { CreateWhyChooseUsDto } from './create-why-choose-us.dto';

export class UpdateWhyChooseUsDto extends PartialType(CreateWhyChooseUsDto) {}
