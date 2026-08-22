import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

const DIMENSION_KEYS = [
  "enrollment.source",
  "enrollment.month",
  "batch.id",
  "batch.title",
  "user.company",
  "payment.gateway",
] as const;

const MEASURE_KEYS = [
  "enrollment.count",
  "revenue.sum",
  "revenue.avg",
  "user.count",
] as const;

export class RunReportDto {
  @IsArray()
  @IsIn(DIMENSION_KEYS, { each: true })
  dimensions: string[] = [];

  @IsArray()
  @IsIn(MEASURE_KEYS, { each: true })
  measures: string[] = [];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class SaveReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string = "";

  @IsArray()
  @IsIn(DIMENSION_KEYS, { each: true })
  dimensions: string[] = [];

  @IsArray()
  @IsIn(MEASURE_KEYS, { each: true })
  measures: string[] = [];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class ShareReportDto {
  @IsString()
  @MinLength(1)
  grantedTo: string = "";
}

const FUNNEL_EVENT_KINDS = [
  "PAGE_VIEW",
  "CATALOGUE_VIEW",
  "CHECKOUT_START",
  "CHECKOUT_COMPLETE",
] as const;

export class CaptureEventDto {
  @IsIn(FUNNEL_EVENT_KINDS)
  kind: string = "";

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  sessionKey?: string;
}

export class FunnelQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class InstructorComparisonQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
