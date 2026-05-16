ALTER TABLE loans   ADD COLUMN IF NOT EXISTS penalty_rate numeric(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS penalty_rate numeric(5, 2) NOT NULL DEFAULT 0;
notify pgrst, 'reload schema';
