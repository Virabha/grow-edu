import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  LEARNER = 'LEARNER',
  INSTRUCTOR = 'INSTRUCTOR',
  CORPORATE_ADMIN = 'CORPORATE_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export type UserRoleName = `${UserRole}`;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (UserRole | UserRoleName)[]) =>
  SetMetadata(ROLES_KEY, roles);

