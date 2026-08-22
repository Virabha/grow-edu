import { batches } from '../database/schema';

export const LISTED_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

export const PUBLIC_BATCH_COLUMNS = {
  batchId: batches.batchId,
  title: batches.title,
  slug: batches.slug,
  shortDescription: batches.shortDescription,
  thumbnail: batches.thumbnail,
  price: batches.price,
  currency: batches.currency,
  language: batches.language,
  goalKey: batches.goalKey,
  deliveryMode: batches.deliveryMode,
  startDate: batches.startDate,
  endDate: batches.endDate,
  status: batches.status,
  categoryId: batches.categoryId,
} as const;
