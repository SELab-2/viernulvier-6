-- Add down migration script here
DROP INDEX trgm_idx_locations_search;

ALTER TABLE locations DROP COLUMN full_search_text;
