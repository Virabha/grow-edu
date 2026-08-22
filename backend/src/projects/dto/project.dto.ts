import { Transform } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from "class-validator";

export class CreateProjectDto {
  @IsString()
  title: string;

  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  brief: unknown[];

  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @IsString()
  rubricId: string;

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  starterRepositoryUrl?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  brief?: unknown[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsString()
  rubricId?: string;

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  starterRepositoryUrl?: string;
}

export class CreateMilestoneDto {
  @IsInt()
  @Min(1)
  ordinal: number;

  @IsString()
  title: string;

  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  description?: unknown[];
}

export class UpdateMilestoneDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  ordinal?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(({ obj, key }) => obj[key])
  @IsArray()
  description?: unknown[];
}

export class EnrolDto {
  @IsString()
  userId: string;
}

export class SubmitMilestoneDto {
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  repositoryUrl: string;

  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  deploymentUrl?: string;
}
