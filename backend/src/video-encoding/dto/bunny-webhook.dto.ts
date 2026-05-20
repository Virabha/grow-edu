import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";

// Bunny Stream Status codes: 3 = finished, 4 = resolutions finished,
// 5 = encoding failed, 6 = upload failed.
export class BunnyWebhookDto {
  @ApiProperty({ description: "Bunny Stream video GUID" })
  @IsString()
  VideoGuid!: string;

  @ApiProperty({ description: "Bunny encoding status code" })
  @IsInt()
  Status!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  VideoLibraryId?: string;
}
