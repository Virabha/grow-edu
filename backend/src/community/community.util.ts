export type AuthorKind = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export function deriveAuthorKind(role: string): AuthorKind {
  if (role === 'PLATFORM_ADMIN') return 'ADMIN';
  if (role === 'INSTRUCTOR') return 'INSTRUCTOR';
  return 'STUDENT';
}
