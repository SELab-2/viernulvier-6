-- Link facets to the collection entity type so the tag picker is available
-- in the CMS collection editor and the /taxonomy/facets?entity_type=collection endpoint
-- returns results.
INSERT INTO facet_entity_types (facet, entity_type) VALUES
  ('discipline', 'collection'),
  ('theme',      'collection'),
  ('audience',   'collection');
