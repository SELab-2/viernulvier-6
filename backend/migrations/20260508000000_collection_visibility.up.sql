CREATE TYPE collection_visibility AS ENUM ('public', 'unlisted');

ALTER TABLE collections
    ADD COLUMN visibility collection_visibility NOT NULL DEFAULT 'public';

-- Drop all series tables (no data migration needed)
DROP TABLE IF EXISTS articles_about_series;
DROP TABLE IF EXISTS series_productions;
DROP TABLE IF EXISTS series_translations;
DROP TABLE IF EXISTS series;
-- Note: 'series' cannot be removed from the entity_type enum in Postgres.
-- The value is left in place; it is harmless without the table.
