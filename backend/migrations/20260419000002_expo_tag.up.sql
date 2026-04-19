INSERT INTO tags (facet, slug, sort_order) VALUES ('discipline', 'expo', 15);

INSERT INTO tag_translations (tag_id, language_code, label) VALUES
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'expo'), 'en', 'Expo'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'expo'), 'nl', 'Expo');
