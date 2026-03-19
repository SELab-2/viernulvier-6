CREATE TYPE user_role AS ENUM ('admin', 'editor', 'user');

CREATE TABLE users (
   id UUID PRIMARY KEY DEFAULT uuidv7(),
   username TEXT NOT NULL,
   email TEXT NOT NULL UNIQUE,
   password_hash TEXT NOT NULL,
   role user_role NOT NULL DEFAULT 'user',
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);