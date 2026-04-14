-- Fixture for GET /stats integration tests.
-- Keeps deterministic golden counts and event bounds independent of other fixtures.

INSERT INTO productions (id, source_id, slug, starts_at, ends_at, attendance_mode) VALUES
('aa111111-1111-1111-1111-111111111111', 9001, 'stats-production-one', '2026-04-10 20:00:00+02', '2026-04-10 22:00:00+02', 'live'),
('aa222222-2222-2222-2222-222222222222', 9002, 'stats-production-two', '2026-07-15 19:00:00+02', '2026-07-15 21:00:00+02', 'live');

INSERT INTO events (
    id, source_id, created_at, updated_at, starts_at, ends_at, status, production_id
) VALUES
('bb111111-1111-1111-1111-111111111111', 9101, '2026-03-01 10:00:00+00', '2026-03-01 10:00:00+00', '2026-04-10 20:00:00+02', '2026-04-10 22:00:00+02', 'confirmed', 'aa111111-1111-1111-1111-111111111111'),
('bb222222-2222-2222-2222-222222222222', 9102, '2026-03-02 10:00:00+00', '2026-03-02 10:00:00+00', '2026-05-20 21:00:00+02', '2026-05-20 23:00:00+02', 'confirmed', 'aa111111-1111-1111-1111-111111111111'),
('bb333333-3333-3333-3333-333333333333', 9103, '2026-03-03 10:00:00+00', '2026-03-03 10:00:00+00', '2026-07-15 19:00:00+02', '2026-07-15 21:00:00+02', 'cancelled', 'aa222222-2222-2222-2222-222222222222');

INSERT INTO locations (id, source_id, name, city, country, slug) VALUES
('cc000000-0000-0000-0000-000000000001', 9201, 'Stats Hall A', 'Gent', 'Belgium', 'stats-hall-a'),
('cc000000-0000-0000-0000-000000000002', 9202, 'Stats Hall B', 'Gent', 'Belgium', 'stats-hall-b'),
('cc000000-0000-0000-0000-000000000003', 9203, 'Stats Hall C', 'Antwerpen', 'Belgium', 'stats-hall-c'),
('cc000000-0000-0000-0000-000000000004', 9204, 'Stats Hall D', 'Brussel', 'Belgium', 'stats-hall-d');

INSERT INTO articles (id, slug, status, title, content, created_at, updated_at) VALUES
('dd000000-0000-0000-0000-000000000001', 'stats-published', 'published', 'Stats Published', '{"type":"doc","content":[]}', '2026-03-01 10:00:00+00', '2026-03-01 10:00:00+00'),
('dd000000-0000-0000-0000-000000000002', 'stats-draft', 'draft', 'Stats Draft', NULL, '2026-03-02 10:00:00+00', '2026-03-02 10:00:00+00');

INSERT INTO artists (id, name, slug) VALUES
('ee000000-0000-0000-0000-000000000001', 'Stats Artist One', 'stats-artist-one'),
('ee000000-0000-0000-0000-000000000002', 'Stats Artist Two', 'stats-artist-two');

INSERT INTO collections (id, slug) VALUES
('ff000000-0000-0000-0000-000000000001', 'stats-collection-one'),
('ff000000-0000-0000-0000-000000000002', 'stats-collection-two'),
('ff000000-0000-0000-0000-000000000003', 'stats-collection-three');
