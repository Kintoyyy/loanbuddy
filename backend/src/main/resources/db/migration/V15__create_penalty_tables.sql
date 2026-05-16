CREATE TABLE IF NOT EXISTS loan_penalties (
    penalty_id   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id      uuid        NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
    reason       text,
    penalty_date date        NOT NULL DEFAULT CURRENT_DATE,
    created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entry_penalties (
    penalty_id   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id     uuid        NOT NULL REFERENCES entries(entry_id) ON DELETE CASCADE,
    amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
    reason       text,
    penalty_date date        NOT NULL DEFAULT CURRENT_DATE,
    created_at   timestamptz DEFAULT now()
);

notify pgrst, 'reload schema';
