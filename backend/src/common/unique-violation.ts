export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== 'object' || err === null || !('code' in err)) return false;

  const record = err as Record<string, unknown>;
  if (record['code'] !== '23505') return false;
  if (constraint === undefined) return true;

  return (
    record['constraint_name'] === constraint ||
    record['constraint'] === constraint
  );
}
