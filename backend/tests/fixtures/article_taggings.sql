INSERT INTO taggings (tag_id, entity_type, entity_id, inherited)
SELECT t.id, 'article', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false
FROM tags t WHERE t.slug = 'theatre' AND t.facet = 'discipline';
