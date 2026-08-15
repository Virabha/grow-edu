import { PartialType } from '@nestjs/swagger';
import { CreateCourseLanguageDto } from './create-course-language.dto';

export class UpdateCourseLanguageDto extends PartialType(CreateCourseLanguageDto) {}
