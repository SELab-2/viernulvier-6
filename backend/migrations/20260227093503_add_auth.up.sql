CREATE TABLE users ( -- Call this users or admin_users?
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   username TEXT NOT NULL,
   email TEXT NOT NULL UNIQUE,
   password_hash TEXT NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);