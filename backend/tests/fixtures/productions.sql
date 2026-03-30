INSERT INTO productions (
    id,
    source_id,
    slug,
    minimum_age,
    starts_at,
    ends_at,
    attendance_mode
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    1001,
    'heavy-metal-knitting-2026',
    16,
    '2026-05-01 19:00:00+02',
    '2026-05-01 22:00:00+02',
    'live'
),
(
    '22222222-2222-2222-2222-222222222222',
    1002,
    'digital-dystopia-talk',
    NULL,
    '2026-06-15 20:00:00+02',
    '2026-06-15 21:30:00+02',
    'mixed'
),
(
    '33333333-3333-3333-3333-333333333333',
    1003,
    'minimal-event-test',
    NULL,
    NOW() + INTERVAL '1 month',
    NOW() + INTERVAL '1 month 2 hours',
    'online'
),
(
    '44444444-4444-4444-4444-444444444444',
    1004,
    'jazz-night-de-vooruit',
    18,
    '2026-09-10 21:00:00+02',
    '2026-09-11 02:00:00+02',
    'live'
),
(
    '55555555-5555-5555-5555-555555555555',
    1005,
    'experimental-dance-piece',
    12,
    '2026-12-01 20:00:00+01',
    '2026-12-01 21:15:00+01',
    'live'
);

INSERT INTO production_translations (
    production_id,
    language_code,
    supertitle,
    title,
    artist,
    tagline,
    description
) VALUES
('11111111-1111-1111-1111-111111111111', 'nl', 'Workshop Reeks', 'Heavy Metal Breien', 'Gents Breicollectief', 'Wol en staal.', 'Een unieke combinatie van DIY en headbangen.'),
('11111111-1111-1111-1111-111111111111', 'en', 'Workshop Series', 'Heavy Metal Knitting', 'Ghent Knitting Collective', NULL, 'A unique combination of DIY and headbanging.'),
('22222222-2222-2222-2222-222222222222', 'nl', 'Debat', 'Digitale Dystopie', 'Tech Kritiek vzw', 'Is de toekomst binair?', 'Een gesprek over de toekomst van AI.'),
('22222222-2222-2222-2222-222222222222', 'en', 'Debate', 'Digital Dystopia', 'Tech Criticism NGO', NULL, 'A conversation about the future of AI.'),
('33333333-3333-3333-3333-333333333333', 'nl', NULL, 'Minimaal Event', 'Anonieme Kunstenaar', NULL, NULL),
('33333333-3333-3333-3333-333333333333', 'en', NULL, 'Minimal Event', 'Anonymous Artist', NULL, NULL),
('44444444-4444-4444-4444-444444444444', 'nl', 'Concert', 'Jazz Nacht', 'Blue Note Quintet', 'Improvisatie op zijn best.', 'De beste jazz in het hart van Gent.'),
('44444444-4444-4444-4444-444444444444', 'en', 'Concert', 'Jazz Night', 'Blue Note Quintet', NULL, 'The best jazz in the heart of Ghent.'),
('55555555-5555-5555-5555-555555555555', 'nl', 'Dans', 'Beweging in Beeld', 'Kinesis', 'Voel de zwaartekracht.', 'Een experimentele dansvoorstelling.'),
('55555555-5555-5555-5555-555555555555', 'en', 'Dance', 'Motion in Image', 'Kinesis', NULL, 'An experimental dance performance.');
