-- Returns all facets + tags for a given entity as pre-grouped JSONB.
-- Shape: [{ slug, translations, tags: [{ slug, sort_order, inherited, translations }] }]
CREATE OR REPLACE FUNCTION entity_facets(p_type entity_type, p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'slug', sub.facet_slug,
      'translations', sub.facet_trans,
      'tags', sub.tags
    ) ORDER BY sub.facet_enum
  ), '[]'::jsonb)
  FROM (
    SELECT
      t.facet AS facet_enum,
      t.facet::text AS facet_slug,
      (SELECT jsonb_agg(jsonb_build_object(
          'language_code', fl.language_code, 'label', fl.label
       )) FROM facet_labels fl WHERE fl.facet = t.facet
      ) AS facet_trans,
      jsonb_agg(
        jsonb_build_object(
          'slug', t.slug,
          'sort_order', t.sort_order,
          'inherited', tg.inherited,
          'translations', (
            SELECT jsonb_agg(jsonb_build_object(
              'language_code', tt.language_code,
              'label', tt.label,
              'description', tt.description
            )) FROM tag_translations tt WHERE tt.tag_id = t.id
          )
        ) ORDER BY t.sort_order
      ) AS tags
    FROM taggings tg
    JOIN tags t ON t.id = tg.tag_id
    WHERE tg.entity_type = p_type AND tg.entity_id = p_id
    GROUP BY t.facet
  ) sub
$$;
