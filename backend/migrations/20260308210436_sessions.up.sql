CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuidv7(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups during the refresh process
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- Index to quickly delete all sessions for a specific user (e.g., global logout)
CREATE INDEX idx_sessions_user_id ON sessions(user_id);