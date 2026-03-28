DROP TRIGGER IF EXISTS articles_updated_at ON articles;

DROP INDEX IF EXISTS articles_status_idx;
DROP INDEX IF EXISTS articles_subject_period_start_subject_period_end_idx;

ALTER TABLE articles
    ALTER COLUMN content_nl TYPE TEXT USING content_nl::text,
    ALTER COLUMN content_en TYPE TEXT USING content_en::text;

ALTER TABLE articles
    ALTER COLUMN content_nl SET NOT NULL,
    ALTER COLUMN content_en SET NOT NULL,
    ALTER COLUMN title_nl   SET NOT NULL,
    ALTER COLUMN title_en   SET NOT NULL;

ALTER TABLE articles DROP COLUMN subject_period_end;
ALTER TABLE articles DROP COLUMN subject_period_start;
ALTER TABLE articles DROP COLUMN status;

ALTER TABLE articles ADD COLUMN author TEXT NOT NULL DEFAULT '';

ALTER TABLE articles RENAME TO blogposts;

DROP TYPE article_status;
