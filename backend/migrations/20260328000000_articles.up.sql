-- Migrate blogposts table to articles with expanded schema

-- 1. Create article_status enum
CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');

-- 2. Rename the table (FK constraints in articles_about_* follow automatically via OID)
ALTER TABLE blogposts RENAME TO articles;

-- 3. Drop author column
ALTER TABLE articles DROP COLUMN author;

-- 4. Add status (default draft for existing rows), subject period
ALTER TABLE articles ADD COLUMN status article_status NOT NULL DEFAULT 'draft';
ALTER TABLE articles ADD COLUMN subject_period_start DATE;
ALTER TABLE articles ADD COLUMN subject_period_end   DATE;

-- 5. Convert content columns from TEXT to JSONB
--    Existing rows become JSON strings, which are valid JSONB
ALTER TABLE articles
    ALTER COLUMN content_nl TYPE JSONB USING to_jsonb(content_nl),
    ALTER COLUMN content_en TYPE JSONB USING to_jsonb(content_en);

-- 6. Make title/content nullable (drafts don't need full content yet)
ALTER TABLE articles
    ALTER COLUMN content_nl DROP NOT NULL,
    ALTER COLUMN content_en DROP NOT NULL,
    ALTER COLUMN title_nl   DROP NOT NULL,
    ALTER COLUMN title_en   DROP NOT NULL;

-- 7. Auto-set published_at when status transitions to published
CREATE FUNCTION articles_set_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status <> 'published' THEN
        NEW.published_at = now();
    END IF;
    IF NEW.status <> 'published' THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER articles_published_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION articles_set_published_at();

-- 8. Add updated_at trigger (not present on blogposts table)
CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Indexes
CREATE INDEX ON articles (status);
CREATE INDEX ON articles (subject_period_start, subject_period_end);
