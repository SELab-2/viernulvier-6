INSERT INTO media (
    id,
    created_at,
    updated_at,
    s3_key,
    mime_type,
    file_size,
    width,
    height,
    checksum,
    alt_text,
    description,
    credit,
    gallery_type,
    source_id,
    source_system,
    source_uri,
    source_updated_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW(),
    NOW(),
    'media/production/1001/media/cover.jpg',
    'image/jpeg',
    12345,
    1200,
    800,
    'abc123',
    'Cover image',
    'Main gallery cover',
    'Photo credit',
    'media',
    2001,
    'viernulvier',
    '/api/v1/media-items/2001',
    NOW()
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    NOW(),
    NOW(),
    'media/production/1001/poster/poster.jpg',
    'image/jpeg',
    9999,
    1000,
    1500,
    'def456',
    'Poster image',
    'Poster',
    'Poster credit',
    'poster',
    2002,
    'viernulvier',
    '/api/v1/media-items/2002',
    NOW()
);

INSERT INTO entity_media (
    id,
    entity_type,
    entity_id,
    media_id,
    role,
    sort_order,
    is_cover_image,
    created_at
) VALUES
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'production',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'gallery',
    0,
    true,
    NOW()
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'production',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'poster',
    0,
    true,
    NOW()
);

INSERT INTO media_variant (
    id,
    media_id,
    variant_kind,
    crop_name,
    created_at,
    updated_at,
    s3_key,
    mime_type,
    file_size,
    width,
    height,
    checksum,
    source_uri
) VALUES
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'crop',
    'square',
    NOW(),
    NOW(),
    'media/production/1001/media/crops/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/square.jpg',
    'image/jpeg',
    4567,
    400,
    400,
    'crop123',
    'https://example.com/crop/square.jpg'
);
