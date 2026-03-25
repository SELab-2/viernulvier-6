ALTER TABLE collections DROP COLUMN slug;

-- note: PostgreSQL does not support removing values from an enum.
-- The artist and location values cannot be removed from collection_content_type.
