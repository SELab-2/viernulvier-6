-- =========================
-- Collections
-- =========================
INSERT INTO collections (id, slug) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'zomerselectie'
),
(
    '20000000-0000-0000-0000-000000000002',
    'dans-2025'
),
(
    '20000000-0000-0000-0000-000000000003',
    'winterselectie'
),
(
    '20000000-0000-0000-0000-000000000004',
    'lentespecial'
),
(
    '20000000-0000-0000-0000-000000000005',
    'selectie-voor-kinderen'
);

-- =========================
-- Translations
-- =========================
INSERT INTO collection_translations (collection_id, language_code, title, description) VALUES
-- zomerselectie
('20000000-0000-0000-0000-000000000001', 'nl', 'Zomerselectie', 'Onze favoriete zomerproducties'),
('20000000-0000-0000-0000-000000000001', 'en', 'Summer Selection', 'Our favourite summer productions'),

-- dans-2025
('20000000-0000-0000-0000-000000000002', 'nl', 'Dans 2025', ''),
('20000000-0000-0000-0000-000000000002', 'en', 'Dance 2025', ''),

-- winterselectie
('20000000-0000-0000-0000-000000000003', 'nl', 'Winterselectie', 'Beste winter events'),
('20000000-0000-0000-0000-000000000003', 'en', 'Winter Selection', 'Best winter events'),

-- lentespecial
('20000000-0000-0000-0000-000000000004', 'nl', 'Lentespecial', ''),
('20000000-0000-0000-0000-000000000004', 'en', 'Spring Special', ''),

-- selectie-voor-kinderen
('20000000-0000-0000-0000-000000000005', 'nl', 'Selectie voor kinderen', ''),
('20000000-0000-0000-0000-000000000005', 'en', 'Selection for kids', '');

-- =========================
-- Collection Items
-- =========================
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
