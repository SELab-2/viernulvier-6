-- Step 1: re-add label (NOT NULL) and description columns to tags
ALTER TABLE tags
    ADD COLUMN label       TEXT NOT NULL DEFAULT '',
    ADD COLUMN description TEXT;

-- Step 2: restore English labels from tag_translations
UPDATE tags t
SET
    label       = tt.label,
    description = tt.description
FROM tag_translations tt
WHERE tt.tag_id = t.id AND tt.language_code = 'en';

-- Step 3: remove the temporary DEFAULT now that rows are populated
ALTER TABLE tags ALTER COLUMN label DROP DEFAULT;

-- Step 4: recreate the facet_label() helper function
CREATE FUNCTION facet_label(f facet) RETURNS text
LANGUAGE sql IMMUTABLE RETURNS NULL ON NULL INPUT AS $$
  SELECT CASE f
    WHEN 'discipline' THEN 'Discipline'
    WHEN 'format'     THEN 'Format'
    WHEN 'theme'      THEN 'Theme'
    WHEN 'audience'   THEN 'Audience'
  END
$$;

-- Step 5: recreate the entity_tags view
CREATE VIEW entity_tags AS
SELECT
  tg.entity_type,
  tg.entity_id,
  tg.inherited,
  t.facet::text        AS facet_slug,
  facet_label(t.facet) AS facet_label,
  t.slug               AS tag_slug,
  t.label              AS tag_label,
  t.sort_order         AS tag_sort_order
FROM taggings tg
JOIN tags t ON t.id = tg.tag_id
ORDER BY t.facet, t.sort_order;

-- Step 6: drop translation tables
DROP TABLE tag_translations;
DROP TABLE facet_labels;
