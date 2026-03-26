ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'artist';
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'location';

ALTER TABLE collections ADD COLUMN slug TEXT NOT NULL DEFAULT '';
UPDATE collections SET slug = id::TEXT WHERE slug = '';
ALTER TABLE collections ALTER COLUMN slug DROP DEFAULT;
ALTER TABLE collections ADD CONSTRAINT collections_slug_key UNIQUE (slug);
