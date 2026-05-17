-- Requires: collections fixture, productions fixture
-- Links production 1 to collection 1 (public: zomerselectie) and collection 4 (unlisted: lentespecial)

INSERT INTO collection_items (id, collection_id, content_id, content_type, position) VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'production',
    1
),
(
    'c1000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'production',
    1
);
