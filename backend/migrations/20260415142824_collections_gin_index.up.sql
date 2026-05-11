-- Add up migration script here
CREATE INDEX trgm_idx_collection_translations_search
ON collection_translations
USING GIN (title gin_trgm_ops);