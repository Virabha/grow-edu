import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class SendBulkNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  vars: Record<string, string>;

  @IsOptional()
  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  fanoutId: string;
}
