ALTER TABLE collections DROP COLUMN IF EXISTS visibility;
DROP TYPE IF EXISTS collection_visibility;

-- Re-create series tables (empty — no data migration)
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE series_translations (
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (series_id, language_code)
);

CREATE TABLE series_productions (
    series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    production_id UUID NOT NULL,
    PRIMARY KEY (series_id, production_id)
);
