import { IsBoolean } from 'class-validator';

export class SetLowBandwidthDto {
  @IsBoolean()
  lowBandwidth: boolean;
}
