ALTER TABLE articles
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ', title)) STORED;

CREATE INDEX trgm_idx_articles_search
ON articles
USING GIN (full_search_text gin_trgm_ops);
