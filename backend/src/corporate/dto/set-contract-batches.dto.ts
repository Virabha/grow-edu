import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export const MAX_CONTRACT_BATCHES = 100;

export class SetContractBatchesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(MAX_CONTRACT_BATCHES)
  @ArrayUnique()
  @IsString({ each: true })
  batchIds: string[];
}
