CREATE TYPE normalization_status AS ENUM (
    'executed',
    'skipped_low_confidence',
    'skipped_error'
);

CREATE TABLE normalization_log (
    id            UUID PRIMARY KEY DEFAULT uuidv7(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    production_id UUID REFERENCES productions(id) ON DELETE CASCADE,
    action_type   TEXT NOT NULL,
    target_entity TEXT,
    target_id     UUID,
    confidence    REAL,
    status        normalization_status NOT NULL,
    payload       JSONB NOT NULL
);

CREATE INDEX normalization_log_production_idx ON normalization_log (production_id);
CREATE INDEX normalization_log_created_idx    ON normalization_log (created_at DESC);
