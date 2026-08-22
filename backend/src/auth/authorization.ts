import { AUTHENTICATED_KEY } from './decorators/authenticated.decorator';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';
import { SELF_OR_ADMIN_KEY } from './decorators/self-or-admin.decorator';
import { BATCH_ACCESS_KEY } from '../batches/access/batch-access.decorator';

export const AUTHORIZATION_KEYS = [
  IS_PUBLIC_KEY,
  ROLES_KEY,
  AUTHENTICATED_KEY,
  SELF_OR_ADMIN_KEY,
  BATCH_ACCESS_KEY,
] as const;
