-- fixtures/production_tags.sql

-- Discipline: Music
INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'production', '11111111-1111-1111-1111-111111111111', false
FROM tags t WHERE t.slug = 'music' AND t.facet = 'discipline';

INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'production', '44444444-4444-4444-4444-444444444444', false
FROM tags t WHERE t.slug = 'music' AND t.facet = 'discipline';

-- Theme: Politics
INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'production', '22222222-2222-2222-2222-222222222222', false
FROM tags t WHERE t.slug = 'politics' AND t.facet = 'theme';

-- Format: Workshop
INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'production', '11111111-1111-1111-1111-111111111111', false
FROM tags t WHERE t.slug = 'workshop' AND t.facet = 'format';

-- Audience: All ages
INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'production', '55555555-5555-5555-5555-555555555555', false
FROM tags t WHERE t.slug = 'all-ages' AND t.facet = 'audience';
