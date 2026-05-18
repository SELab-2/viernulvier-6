CREATE TABLE revoked_users (
    user_id UUID PRIMARY KEY,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revoked_users_revoked_at ON revoked_users(revoked_at);
