ALTER TABLE articles RENAME COLUMN content TO content_nl;
ALTER TABLE articles ADD COLUMN content_en JSONB;
