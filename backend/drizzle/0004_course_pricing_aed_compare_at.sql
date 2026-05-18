-- Add compare-at price (strike-through) and default AED currency

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2);

ALTER TABLE courses
  ALTER COLUMN currency SET DEFAULT 'AED';

