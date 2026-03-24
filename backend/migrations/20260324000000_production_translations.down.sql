-- Step 1: re-add bilingual columns (all nullable to avoid constraint issues)
ALTER TABLE productions
    ADD COLUMN supertitle_nl       TEXT,
    ADD COLUMN supertitle_en       TEXT,
    ADD COLUMN title_nl            TEXT,
    ADD COLUMN title_en            TEXT,
    ADD COLUMN artist_nl           TEXT,
    ADD COLUMN artist_en           TEXT,
    ADD COLUMN meta_title_nl       TEXT,
    ADD COLUMN meta_title_en       TEXT,
    ADD COLUMN meta_description_nl TEXT,
    ADD COLUMN meta_description_en TEXT,
    ADD COLUMN tagline_nl          TEXT,
    ADD COLUMN tagline_en          TEXT,
    ADD COLUMN teaser_nl           TEXT,
    ADD COLUMN teaser_en           TEXT,
    ADD COLUMN description_nl      TEXT,
    ADD COLUMN description_en      TEXT,
    ADD COLUMN description_extra_nl TEXT,
    ADD COLUMN description_extra_en TEXT,
    ADD COLUMN description_2_nl    TEXT,
    ADD COLUMN description_2_en    TEXT,
    ADD COLUMN quote_nl            TEXT,
    ADD COLUMN quote_en            TEXT,
    ADD COLUMN quote_source_nl     TEXT,
    ADD COLUMN quote_source_en     TEXT,
    ADD COLUMN programme_nl        TEXT,
    ADD COLUMN programme_en        TEXT,
    ADD COLUMN info_nl             TEXT,
    ADD COLUMN info_en             TEXT,
    ADD COLUMN description_short_nl TEXT,
    ADD COLUMN description_short_en TEXT;

-- Step 2: restore Dutch values
UPDATE productions p
SET
    supertitle_nl        = pt.supertitle,
    title_nl             = pt.title,
    artist_nl            = pt.artist,
    meta_title_nl        = pt.meta_title,
    meta_description_nl  = pt.meta_description,
    tagline_nl           = pt.tagline,
    teaser_nl            = pt.teaser,
    description_nl       = pt.description,
    description_extra_nl = pt.description_extra,
    description_2_nl     = pt.description_2,
    quote_nl             = pt.quote,
    quote_source_nl      = pt.quote_source,
    programme_nl         = pt.programme,
    info_nl              = pt.info,
    description_short_nl = pt.description_short
FROM production_translations pt
WHERE pt.production_id = p.id AND pt.language_code = 'nl';

-- Step 3: restore English values
UPDATE productions p
SET
    supertitle_en        = pt.supertitle,
    title_en             = pt.title,
    artist_en            = pt.artist,
    meta_title_en        = pt.meta_title,
    meta_description_en  = pt.meta_description,
    tagline_en           = pt.tagline,
    teaser_en            = pt.teaser,
    description_en       = pt.description,
    description_extra_en = pt.description_extra,
    description_2_en     = pt.description_2,
    quote_en             = pt.quote,
    quote_source_en      = pt.quote_source,
    programme_en         = pt.programme,
    info_en              = pt.info,
    description_short_en = pt.description_short
FROM production_translations pt
WHERE pt.production_id = p.id AND pt.language_code = 'en';

-- Step 4: drop translation tables
DROP TABLE production_translations;
DROP TABLE languages;
