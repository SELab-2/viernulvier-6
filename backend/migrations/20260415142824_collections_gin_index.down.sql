-- Add down migration script here
DROP INDEX trgm_idx_collection_translations_search;

ALTER TABLE collection_translations DROP COLUMN full_search_text;