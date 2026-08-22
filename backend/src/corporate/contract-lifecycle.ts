export type ContractStatus =
  | 'DRAFT'
  | 'AWAITING_PAYMENT'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'CANCELLED';

export const EXPIRING_WINDOW_DAYS = 30;

const MS_PER_DAY = 86_400_000;

export function daysUntil(endsAt: Date, now: number): number {
  return Math.ceil((endsAt.getTime() - now) / MS_PER_DAY);
}

export function effectiveStatus(
  stored: ContractStatus,
  endsAt: Date,
  now: number,
): ContractStatus {
  if (
    stored === 'CANCELLED' ||
    stored === 'DRAFT' ||
    stored === 'AWAITING_PAYMENT'
  ) {
    return stored;
  }
  if (endsAt.getTime() <= now) return 'EXPIRED';
  return daysUntil(endsAt, now) <= EXPIRING_WINDOW_DAYS ? 'EXPIRING' : 'ACTIVE';
}

export function acceptsSeatClaims(status: ContractStatus): boolean {
  return status === 'ACTIVE' || status === 'EXPIRING';
}
