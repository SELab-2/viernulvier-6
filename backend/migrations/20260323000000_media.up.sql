-- Extend entity_type enum with 'event' so events can carry tags and media
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'event';

-- Extend collection_content_type enum with 'media'
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'media';

-- Media table: stores metadata for all uploaded files
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- S3 storage reference (null if using external_url)
    s3_key VARCHAR,
    -- External URL reference (for imported media from viernulvier API)
    external_url VARCHAR,

    -- File metadata
    mime_type VARCHAR NOT NULL,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    checksum VARCHAR,

    -- Content metadata
    alt_text VARCHAR,
    description VARCHAR,
    credit VARCHAR,

    -- Geolocation (for venue/location photos)
    geo_latitude DOUBLE PRECISION,
    geo_longitude DOUBLE PRECISION,

    -- Derivative tracking: null = original/master file
    parent_id UUID REFERENCES media(id) ON DELETE CASCADE,
    derivative_type VARCHAR,

    -- Gallery type for imported media (media, review, poster)
    gallery_type VARCHAR,

    -- Source tracking (for imported media)
    source_id INTEGER
);

CREATE TRIGGER update_media_updated_at
    BEFORE UPDATE ON media
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Entity-media join table: links media to any entity (events, productions, blogposts)
CREATE TABLE entity_media (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_cover_image BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(entity_type, entity_id, media_id)
);

CREATE INDEX idx_entity_media_entity ON entity_media(entity_type, entity_id);
CREATE INDEX idx_entity_media_media ON entity_media(media_id);
CREATE INDEX idx_media_parent ON media(parent_id) WHERE parent_id IS NOT NULL;
