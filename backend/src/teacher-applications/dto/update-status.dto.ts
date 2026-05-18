import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum TeacherApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateTeacherApplicationStatusDto {
  @ApiProperty({ enum: TeacherApplicationStatus })
  @IsEnum(TeacherApplicationStatus)
  status: TeacherApplicationStatus;
}
