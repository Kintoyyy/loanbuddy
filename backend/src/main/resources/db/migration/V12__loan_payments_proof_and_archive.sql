ALTER TABLE loan_payments
    ADD COLUMN IF NOT EXISTS proof_filename  text,
    ADD COLUMN IF NOT EXISTS proof_mime_type text,
    ADD COLUMN IF NOT EXISTS is_archived     boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS archive_reason  text;

notify pgrst, 'reload schema';
