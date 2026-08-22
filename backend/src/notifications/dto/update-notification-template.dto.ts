import { IsString } from "class-validator";

export class UpdateNotificationTemplateDto {
  @IsString()
  subject: string;

  @IsString()
  body: string;
}
