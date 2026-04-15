CREATE TABLE location_translations (
    id               UUID PRIMARY KEY DEFAULT uuidv7(),
    location_id      UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    language_code    TEXT NOT NULL REFERENCES languages(code),
    description      TEXT,
    history          TEXT,
    UNIQUE (location_id, language_code)
);

CREATE INDEX ON location_translations (location_id);
