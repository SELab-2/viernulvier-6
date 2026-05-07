CREATE INDEX trgm_idx_articles_title
ON articles
USING GIN (title gin_trgm_ops);
