-- Extend content type enum to support all entity types
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'artist';
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'location';

-- Add slug to collections (no existing rows in any environment, NOT NULL safe)
ALTER TABLE collections ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT '';
ALTER TABLE collections ALTER COLUMN slug DROP DEFAULT;
