import { IsString, IsIn } from 'class-validator';

export class PublishItemDto {
  @IsIn(['PROJECT', 'SKILL', 'CERTIFICATE'])
  kind: 'PROJECT' | 'SKILL' | 'CERTIFICATE';

  @IsString()
  referenceId: string;
}
