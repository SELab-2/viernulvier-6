-- Add up migration script here
ALTER TABLE locations
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ', name, city)) STORED;

CREATE INDEX trgm_idx_locations_search
ON locations
USING GIN (full_search_text gin_trgm_ops);
