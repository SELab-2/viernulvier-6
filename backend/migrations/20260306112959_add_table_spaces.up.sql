CREATE TABLE spaces (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    source_id   INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    name_nl     TEXT        NOT NULL,
    location_id UUID        NOT NULL REFERENCES locations(id)
);

