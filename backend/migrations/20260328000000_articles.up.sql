CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');

ALTER TABLE blogposts RENAME TO articles;
ALTER TABLE articles DROP COLUMN author;
ALTER TABLE articles ADD COLUMN status article_status NOT NULL DEFAULT 'draft';
ALTER TABLE articles ADD COLUMN subject_period_start DATE;
ALTER TABLE articles ADD COLUMN subject_period_end   DATE;

ALTER TABLE articles
    ALTER COLUMN content_nl TYPE JSONB USING to_jsonb(content_nl),
    ALTER COLUMN content_en TYPE JSONB USING to_jsonb(content_en);

ALTER TABLE articles
    ALTER COLUMN content_nl DROP NOT NULL,
    ALTER COLUMN content_en DROP NOT NULL,
    ALTER COLUMN title_nl   DROP NOT NULL,
    ALTER COLUMN title_en   DROP NOT NULL;

CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX ON articles (status);
CREATE INDEX ON articles (subject_period_start, subject_period_end);
