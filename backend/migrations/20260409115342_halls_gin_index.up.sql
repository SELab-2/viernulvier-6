-- Add up migration script here
ALTER TABLE halls
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ', name)) STORED;

CREATE INDEX trgm_idx_halls_search
ON halls
USING GIN (full_search_text gin_trgm_ops);
