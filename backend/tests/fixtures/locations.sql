INSERT INTO locations (id, source_id, name, city, country, slug) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    1001,
    'De Vooruit',
    'Gent',
    'Belgium',
    'de-vooruit'
),
(
    '10000000-0000-0000-0000-000000000002',
    1002,
    'De Bijloke',
    'Gent',
    'Belgium',
    'de-bijloke'
),
(
    '10000000-0000-0000-0000-000000000003',
    1003,
    'Capitole',
    'Gent',
    'Belgium',
    NULL
),
(
    '10000000-0000-0000-0000-000000000004',
    1004,
    'NTGent',
    'Gent',
    'Belgium',
    NULL
),
(
    '10000000-0000-0000-0000-000000000005',
    1005,
    'Minard',
    'Gent',
    'Belgium',
    NULL
);

INSERT INTO location_translations (location_id, language_code, description, history) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'nl',
    'Kunstencentrum in het hart van Gent',
    'Gebouwd in 1913 als feestlokaal'
),
(
    '10000000-0000-0000-0000-000000000001',
    'en',
    'Arts centre in the heart of Ghent',
    'Built in 1913 as a festival hall'
);
