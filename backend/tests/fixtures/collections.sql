INSERT INTO collections (id, slug) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'zomerselectie'
),
(
    '20000000-0000-0000-0000-000000000002',
    'dans-2025'
);

INSERT INTO collection_translations (collection_id, language_code, title, description) VALUES
('20000000-0000-0000-0000-000000000001', 'nl', 'Zomerselectie', 'Onze favoriete zomerproducties'),
('20000000-0000-0000-0000-000000000001', 'en', 'Summer Selection', 'Our favourite summer productions'),
('20000000-0000-0000-0000-000000000002', 'nl', 'Dans 2025', ''),
('20000000-0000-0000-0000-000000000002', 'en', 'Dance 2025', '');

INSERT INTO collection_items (id, collection_id, content_id, content_type, position) VALUES
(
    '20000000-0000-0000-0001-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'production',
    1
),
(
    '20000000-0000-0000-0001-000000000002',
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'artist',
    2
);

INSERT INTO collection_item_translations (collection_item_id, language_code, comment) VALUES
('20000000-0000-0000-0001-000000000001', 'nl', NULL),
('20000000-0000-0000-0001-000000000001', 'en', NULL),
('20000000-0000-0000-0001-000000000002', 'nl', NULL),
('20000000-0000-0000-0001-000000000002', 'en', NULL);
