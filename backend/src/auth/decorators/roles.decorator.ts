import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  LEARNER = 'LEARNER',
  INSTRUCTOR = 'INSTRUCTOR',
  CORPORATE_ADMIN = 'CORPORATE_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

