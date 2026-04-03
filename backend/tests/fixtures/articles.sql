INSERT INTO articles (
    id,
    slug,
    status,
    title,
    content,
    subject_period_start,
    subject_period_end,
    created_at,
    updated_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'published-article',
    'published',
    'A Published Article',
    '{"type": "doc", "content": []}',
    '2026-01-01',
    '2026-06-30',
    '2026-03-01 10:00:00+00',
    '2026-03-01 10:00:00+00'
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'draft-article',
    'draft',
    'A Draft Article',
    NULL,
    NULL,
    NULL,
    '2026-03-02 10:00:00+00',
    '2026-03-02 10:00:00+00'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'archived-article',
    'archived',
    'An Archived Article',
    '{"type": "doc", "content": []}',
    '2025-01-01',
    '2025-12-31',
    '2026-03-03 10:00:00+00',
    '2026-03-03 10:00:00+00'
);
