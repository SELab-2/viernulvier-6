CREATE INDEX trgm_idx_halls_name
ON halls
USING GIN (name gin_trgm_ops);
