CREATE TABLE import_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type       TEXT NOT NULL,
    filename          TEXT NOT NULL,
    original_headers  TEXT[] NOT NULL,
    mapping           JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL,
    row_count         INT  NOT NULL DEFAULT 0,
    created_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at      TIMESTAMPTZ,
    error             TEXT,
    CHECK (status IN (
        'uploaded','mapping','dry_run_pending','dry_run_ready',
        'committing','committed','failed','cancelled'))
);
CREATE INDEX import_sessions_created_at_idx ON import_sessions (created_at DESC);
CREATE INDEX import_sessions_status_idx ON import_sessions (status);
CREATE TRIGGER import_sessions_updated_at
    BEFORE UPDATE ON import_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE import_rows (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
    row_number        INT NOT NULL,
    raw_data          JSONB NOT NULL,
    overrides         JSONB NOT NULL DEFAULT '{}'::jsonb,
    resolved_refs     JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            TEXT NOT NULL,
    target_entity_id  UUID,
    diff              JSONB,
    warnings          JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE (session_id, row_number),
    CHECK (status IN (
        'pending','will_create','will_update','will_skip',
        'error','created','updated','skipped','reverted'))
);
CREATE INDEX import_rows_session_id_idx ON import_rows (session_id);
CREATE INDEX import_rows_status_idx ON import_rows (status);

CREATE TABLE import_session_files (
    session_id UUID PRIMARY KEY REFERENCES import_sessions(id) ON DELETE CASCADE,
    s3_key     TEXT NOT NULL
);
