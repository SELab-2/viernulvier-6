-- Extend entity_type enum with 'event' so events can carry tags and media
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'event';

-- Extend collection_content_type enum with 'media'
ALTER TYPE collection_content_type ADD VALUE IF NOT EXISTS 'media';

-- Media table: stores metadata for all uploaded files
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- S3 storage reference (required: all media must be in Garage/S3)
    s3_key VARCHAR NOT NULL,

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
    parent_id UUID REFERENCES media(id) ON DELETE RESTRICT,
    derivative_type VARCHAR,

    -- Gallery type for imported media (media, review, poster)
    gallery_type VARCHAR,

    -- Source tracking (for imported media)
    source_id INTEGER,
    source_system VARCHAR NOT NULL DEFAULT 'cms',
    source_uri VARCHAR,
    source_updated_at TIMESTAMPTZ
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
    role VARCHAR NOT NULL DEFAULT 'gallery',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_cover_image BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT entity_media_role_valid CHECK (
        role IN ('gallery', 'cover', 'poster', 'review', 'hero', 'thumbnail', 'inline', 'media')
    ),

    UNIQUE(entity_type, entity_id, media_id)
);

CREATE INDEX idx_entity_media_entity ON entity_media(entity_type, entity_id);
CREATE INDEX idx_entity_media_media ON entity_media(media_id);
CREATE INDEX idx_entity_media_role ON entity_media(entity_type, entity_id, role, sort_order);
CREATE UNIQUE INDEX idx_entity_media_one_cover_per_role
    ON entity_media(entity_type, entity_id, role)
    WHERE is_cover_image = true;
CREATE INDEX idx_media_parent ON media(parent_id) WHERE parent_id IS NOT NULL;
CREATE UNIQUE INDEX idx_media_s3_key_unique ON media(s3_key);
CREATE UNIQUE INDEX idx_media_source_uri_unique ON media(source_system, source_uri)
    WHERE source_uri IS NOT NULL;

-- Variants / crops for a media item (thumbnails, named crops, generated derivatives)
CREATE TABLE media_variant (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    media_id UUID NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
    variant_kind VARCHAR NOT NULL,
    crop_name VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    s3_key VARCHAR NOT NULL,
    mime_type VARCHAR,
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    checksum VARCHAR,

    source_uri VARCHAR,

    CONSTRAINT media_variant_unique_per_media UNIQUE(media_id, variant_kind, crop_name)
);

CREATE TRIGGER update_media_variant_updated_at
    BEFORE UPDATE ON media_variant
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_media_variant_media ON media_variant(media_id);
CREATE UNIQUE INDEX idx_media_variant_s3_key_unique ON media_variant(s3_key);
