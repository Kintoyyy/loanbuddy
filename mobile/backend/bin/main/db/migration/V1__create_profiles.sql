CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    bio TEXT,
    photo_filename TEXT,
    photo_mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
