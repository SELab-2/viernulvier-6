ALTER TABLE articles ADD COLUMN published_at TIMESTAMPTZ;

-- Backfill: set published_at = updated_at for already-published articles
UPDATE articles SET published_at = updated_at WHERE status = 'published';
