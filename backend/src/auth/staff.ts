import { UserRole } from "./decorators/roles.decorator";

export function isStaffRole(role: string | undefined): boolean {
  return role === UserRole.PLATFORM_ADMIN || role === UserRole.INSTRUCTOR;
}
