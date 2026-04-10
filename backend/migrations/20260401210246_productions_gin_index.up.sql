-- add a column that is the joined string of all searchable columns
ALTER TABLE production_translations
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ', title, supertitle, artist)) STORED;

-- create an index over that column
CREATE INDEX trgm_idx_production_translations_search
ON production_translations
USING GIN (full_search_text gin_trgm_ops);
