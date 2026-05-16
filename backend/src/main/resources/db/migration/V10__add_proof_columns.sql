ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS proof_filename  text,
    ADD COLUMN IF NOT EXISTS proof_mime_type text;

ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS proof_filename  text,
    ADD COLUMN IF NOT EXISTS proof_mime_type text;
