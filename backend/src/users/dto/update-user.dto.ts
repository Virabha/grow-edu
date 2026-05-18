import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'profiles/abc123.jpg' })
  @IsOptional()
  @IsString()
  profileImage?: string | null;

  @ApiPropertyOptional({ enum: ['LEARNER', 'INSTRUCTOR', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN'] })
  @IsOptional()
  @IsEnum(['LEARNER', 'INSTRUCTOR', 'CORPORATE_ADMIN', 'PLATFORM_ADMIN'])
  role?: 'LEARNER' | 'INSTRUCTOR' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

