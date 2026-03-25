ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'artist';
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'location';

ALTER TABLE collections ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT '';
ALTER TABLE collections ALTER COLUMN slug DROP DEFAULT;
