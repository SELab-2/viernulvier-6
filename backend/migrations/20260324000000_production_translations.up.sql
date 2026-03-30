-- Step 1: create tables
CREATE TABLE languages (
    code TEXT PRIMARY KEY
);
INSERT INTO languages (code) VALUES ('nl'), ('en');

CREATE TABLE production_translations (
    id               UUID PRIMARY KEY DEFAULT uuidv7(),
    production_id    UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
    language_code    TEXT NOT NULL REFERENCES languages(code),
    supertitle       TEXT,
    title            TEXT,
    artist           TEXT,
    meta_title       TEXT,
    meta_description TEXT,
    tagline          TEXT,
    teaser           TEXT,
    description      TEXT,
    description_extra TEXT,
    description_2    TEXT,
    quote            TEXT,
    quote_source     TEXT,
    programme        TEXT,
    info             TEXT,
    description_short TEXT,
    UNIQUE (production_id, language_code)
);

CREATE INDEX ON production_translations (production_id);

-- Step 2: backfill Dutch translations (skip rows where all fields are null)
INSERT INTO production_translations (
    production_id, language_code,
    supertitle, title, artist, meta_title, meta_description,
    tagline, teaser, description, description_extra, description_2,
    quote, quote_source, programme, info, description_short
)
SELECT
    id, 'nl',
    supertitle_nl, title_nl, artist_nl, meta_title_nl, meta_description_nl,
    tagline_nl, teaser_nl, description_nl, description_extra_nl, description_2_nl,
    quote_nl, quote_source_nl, programme_nl, info_nl, description_short_nl
FROM productions
WHERE (
    supertitle_nl IS NOT NULL OR title_nl IS NOT NULL OR artist_nl IS NOT NULL
    OR meta_title_nl IS NOT NULL OR meta_description_nl IS NOT NULL
    OR tagline_nl IS NOT NULL OR teaser_nl IS NOT NULL OR description_nl IS NOT NULL
    OR description_extra_nl IS NOT NULL OR description_2_nl IS NOT NULL
    OR quote_nl IS NOT NULL OR quote_source_nl IS NOT NULL
    OR programme_nl IS NOT NULL OR info_nl IS NOT NULL
    OR description_short_nl IS NOT NULL
);

-- Step 3: backfill English translations (skip rows where all fields are null)
INSERT INTO production_translations (
    production_id, language_code,
    supertitle, title, artist, meta_title, meta_description,
    tagline, teaser, description, description_extra, description_2,
    quote, quote_source, programme, info, description_short
)
SELECT
    id, 'en',
    supertitle_en, title_en, artist_en, meta_title_en, meta_description_en,
    tagline_en, teaser_en, description_en, description_extra_en, description_2_en,
    quote_en, quote_source_en, programme_en, info_en, description_short_en
FROM productions
WHERE (
    supertitle_en IS NOT NULL OR title_en IS NOT NULL OR artist_en IS NOT NULL
    OR meta_title_en IS NOT NULL OR meta_description_en IS NOT NULL
    OR tagline_en IS NOT NULL OR teaser_en IS NOT NULL OR description_en IS NOT NULL
    OR description_extra_en IS NOT NULL OR description_2_en IS NOT NULL
    OR quote_en IS NOT NULL OR quote_source_en IS NOT NULL
    OR programme_en IS NOT NULL OR info_en IS NOT NULL
    OR description_short_en IS NOT NULL
);

-- Step 4: drop old bilingual columns from productions
ALTER TABLE productions
    DROP COLUMN supertitle_nl,
    DROP COLUMN supertitle_en,
    DROP COLUMN title_nl,
    DROP COLUMN title_en,
    DROP COLUMN artist_nl,
    DROP COLUMN artist_en,
    DROP COLUMN meta_title_nl,
    DROP COLUMN meta_title_en,
    DROP COLUMN meta_description_nl,
    DROP COLUMN meta_description_en,
    DROP COLUMN tagline_nl,
    DROP COLUMN tagline_en,
    DROP COLUMN teaser_nl,
    DROP COLUMN teaser_en,
    DROP COLUMN description_nl,
    DROP COLUMN description_en,
    DROP COLUMN description_extra_nl,
    DROP COLUMN description_extra_en,
    DROP COLUMN description_2_nl,
    DROP COLUMN description_2_en,
    DROP COLUMN quote_nl,
    DROP COLUMN quote_en,
    DROP COLUMN quote_source_nl,
    DROP COLUMN quote_source_en,
    DROP COLUMN programme_nl,
    DROP COLUMN programme_en,
    DROP COLUMN info_nl,
    DROP COLUMN info_en,
    DROP COLUMN description_short_nl,
    DROP COLUMN description_short_en;
