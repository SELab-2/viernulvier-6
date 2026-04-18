DELETE FROM tags WHERE facet IN ('accessibility', 'language');

DELETE FROM facet_entity_types WHERE facet IN ('accessibility', 'language');
DELETE FROM facet_labels        WHERE facet IN ('accessibility', 'language');

DELETE FROM tags WHERE facet = 'discipline' AND slug IN ('nightlife', 'talks', 'comedy', 'spoken-word', 'circus', 'food');
DELETE FROM tags WHERE facet = 'format'     AND slug IN ('guest', 'aftertalk', 'belgian-premiere');
DELETE FROM tags WHERE facet = 'audience'   AND slug = 'family';

UPDATE tag_translations
SET    label = 'Professional'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'audience' AND slug = 'schools')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Professioneel'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'audience' AND slug = 'schools')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'professional', updated_at = now()
WHERE  facet = 'audience' AND slug = 'schools';

UPDATE tag_translations
SET    label = 'World premiere'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'format' AND slug = 'premiere')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Wereldpremière'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'format' AND slug = 'premiere')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'world-premiere', updated_at = now()
WHERE  facet = 'format' AND slug = 'premiere';

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('discipline', 'visual-art', 4);

INSERT INTO tag_translations (tag_id, language_code, label) VALUES
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'visual-art'), 'en', 'Visual art'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'visual-art'), 'nl', 'Beeldende kunst');

UPDATE tag_translations
SET    label = 'Music'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'concert')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Muziek'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'concert')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'music', updated_at = now()
WHERE  facet = 'discipline' AND slug = 'concert';
