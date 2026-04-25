CREATE TABLE import_errors (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,

    run_id UUID,
    severity TEXT NOT NULL,
    entity TEXT NOT NULL,
    source_id INTEGER,
    error_kind TEXT NOT NULL,
    field TEXT,
    relation TEXT,
    relation_source_id INTEGER,
    message TEXT NOT NULL,
    payload JSONB,

    CHECK (severity IN ('warning', 'error'))
);

CREATE UNIQUE INDEX import_errors_active_unique
ON import_errors (
    entity,
    COALESCE(source_id, -1),
    error_kind,
    COALESCE(field, ''),
    COALESCE(relation, ''),
    COALESCE(relation_source_id, -1)
)
WHERE resolved_at IS NULL;

CREATE INDEX import_errors_unresolved_last_seen_at_idx
ON import_errors (last_seen_at DESC)
WHERE resolved_at IS NULL;
