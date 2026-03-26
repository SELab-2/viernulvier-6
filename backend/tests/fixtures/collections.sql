INSERT INTO collections (id, slug, title_nl, title_en, description_nl, description_en) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'zomerselectie',
    'Zomerselectie',
    'Summer Selection',
    'Onze favoriete zomerproducties',
    'Our favourite summer productions'
),
(
    '20000000-0000-0000-0000-000000000002',
    'dans-2025',
    'Dans 2025',
    'Dance 2025',
    '',
    ''
);

INSERT INTO collection_items (id, collection_id, content_id, content_type, position, comment_nl, comment_en) VALUES
(
    '20000000-0000-0000-0001-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'production',
    1,
    NULL,
    NULL
),
(
    '20000000-0000-0000-0001-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'artist',
    2,
    NULL,
    NULL
);
