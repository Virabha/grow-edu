import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class RecordLessonProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: "Seconds to add to the running total" })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: "Playback position in seconds" })
  @IsOptional()
  @IsInt()
  @Min(0)
  lastPosition?: number;

  @ApiPropertyOptional({ description: "Total seconds of the video watched" })
  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;

  @ApiPropertyOptional({ description: "Total seconds of the audio listened to" })
  @IsOptional()
  @IsInt()
  @Min(0)
  listenedSeconds?: number;

  @ApiPropertyOptional({ description: "Distinct pages or blocks viewed" })
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesViewed?: number;
}

export class PositionUpdateDto {
  @ApiProperty()
  @IsString()
  lessonId: string;

  @ApiProperty({ description: "Playback position in seconds" })
  @IsInt()
  @Min(0)
  positionSeconds: number;

  @ApiProperty({
    description:
      "When the client observed this position. The latest observation wins, not the latest request.",
  })
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional({ description: "Total seconds of the video watched" })
  @IsOptional()
  @IsInt()
  @Min(0)
  watchedSeconds?: number;
}

export class RecordPositionsDto {
  @ApiProperty({ type: [PositionUpdateDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PositionUpdateDto)
  positions: PositionUpdateDto[];
}
