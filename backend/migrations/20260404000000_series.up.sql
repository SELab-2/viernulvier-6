-- series table
CREATE TABLE series (
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    slug       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- translations (follows collection_translations pattern)
CREATE TABLE series_translations (
    series_id     UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL REFERENCES languages(code),
    name          TEXT NOT NULL DEFAULT '',
    subtitle      TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (series_id, language_code)
);
CREATE INDEX ON series_translations (series_id);

-- many-to-many join (no position — ordering by event dates)
CREATE TABLE series_productions (
    series_id     UUID NOT NULL REFERENCES series(id)      ON DELETE CASCADE,
    production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
    PRIMARY KEY (series_id, production_id)
);
CREATE INDEX ON series_productions (production_id);

-- article relation (follows articles_about_productions pattern)
CREATE TABLE articles_about_series (
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    series_id  UUID NOT NULL REFERENCES series(id)    ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, series_id)
);
CREATE INDEX ON articles_about_series (series_id);

-- extend entity_type enum for media support
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'series';
