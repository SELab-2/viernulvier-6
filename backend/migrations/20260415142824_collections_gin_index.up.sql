-- Add up migration script here
ALTER TABLE collection_translations
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ', title)) STORED;

CREATE INDEX trgm_idx_collection_translations_search
ON collection_translations
USING GIN (full_search_text gin_trgm_ops);