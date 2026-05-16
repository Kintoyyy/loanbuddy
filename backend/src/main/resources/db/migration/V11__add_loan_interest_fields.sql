ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS interest_rate     numeric(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_frequency text          NOT NULL DEFAULT 'none';

notify pgrst, 'reload schema';
