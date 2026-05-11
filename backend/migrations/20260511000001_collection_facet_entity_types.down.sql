DELETE FROM facet_entity_types
WHERE entity_type = 'collection'
  AND facet IN ('discipline', 'theme', 'audience');
