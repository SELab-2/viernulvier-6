DROP INDEX trgm_idx_articles_search;

ALTER TABLE articles DROP COLUMN full_search_text;
