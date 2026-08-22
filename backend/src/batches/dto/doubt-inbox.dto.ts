import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AssignDoubtDto {
  @ApiProperty({ description: "An instructor already assigned to this batch" })
  @IsString()
  @IsNotEmpty()
  instructorId: string;
}

export class PromoteDoubtDto {
  @ApiProperty({ description: "The reply on this doubt to show the batch" })
  @IsString()
  @IsNotEmpty()
  replyId: string;

  @ApiPropertyOptional({
    description: "Announce the promoted answer to the batch. Off by default.",
  })
  @IsOptional()
  @IsBoolean()
  notifyBatch?: boolean;
}
