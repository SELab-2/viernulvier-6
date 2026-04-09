-- Add down migration script here
DROP INDEX trgm_idx_halls_search;

ALTER TABLE halls DROP COLUMN full_search_text;
