INSERT INTO series (id, slug) VALUES
('a0000000-0000-0000-0000-000000000001', 'palmarium'),
('a0000000-0000-0000-0000-000000000002', 'fresh-juice');

INSERT INTO series_translations (series_id, language_code, name, subtitle, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'nl', 'Palmarium', 'Concertreeks in de plantentuin', 'De jaarlijkse concertreeks.'),
('a0000000-0000-0000-0000-000000000001', 'en', 'Palmarium', 'Concert series in the botanical garden', 'The annual concert series.'),
('a0000000-0000-0000-0000-000000000002', 'nl', 'Fresh Juice', 'Nieuw talent', ''),
('a0000000-0000-0000-0000-000000000002', 'en', 'Fresh Juice', 'New talent', '');

INSERT INTO series_productions (series_id, production_id) VALUES
('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111');
