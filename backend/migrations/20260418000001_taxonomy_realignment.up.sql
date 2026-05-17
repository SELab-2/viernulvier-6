UPDATE tag_translations
SET    label = 'Concert'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'music')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Concert'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'music')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'concert', updated_at = now()
WHERE  facet = 'discipline' AND slug = 'music';

DELETE FROM tags WHERE facet = 'discipline' AND slug = 'visual-art';

UPDATE tag_translations
SET    label = 'Premiere'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'format' AND slug = 'world-premiere')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Première'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'format' AND slug = 'world-premiere')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'premiere', updated_at = now()
WHERE  facet = 'format' AND slug = 'world-premiere';


UPDATE tag_translations
SET    label = 'For schools'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'audience' AND slug = 'professional')
  AND  language_code = 'en';

UPDATE tag_translations
SET    label = 'Schoolvoorstelling'
WHERE  tag_id = (SELECT id FROM tags WHERE facet = 'audience' AND slug = 'professional')
  AND  language_code = 'nl';

UPDATE tags
SET    slug = 'schools', updated_at = now()
WHERE  facet = 'audience' AND slug = 'professional';

INSERT INTO facet_entity_types (facet, entity_type) VALUES
  ('accessibility', 'production'),
  ('accessibility', 'article'),
  ('accessibility', 'media'),
  ('language',      'production');

INSERT INTO facet_labels (facet, language_code, label) VALUES
  ('accessibility', 'en', 'Accessibility'),
  ('accessibility', 'nl', 'Toegankelijkheid'),
  ('language',      'en', 'Language'),
  ('language',      'nl', 'Taal');

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('discipline', 'nightlife',    9),
  ('discipline', 'talks',       10),
  ('discipline', 'comedy',      11),
  ('discipline', 'spoken-word', 12),
  ('discipline', 'circus',      13),
  ('discipline', 'food',        14);

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('format', 'guest',            9),
  ('format', 'aftertalk',       10),
  ('format', 'belgian-premiere', 11);

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('audience', 'family', 5);

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('accessibility', 'audio-description', 1),
  ('accessibility', 'relaxed',           2),
  ('accessibility', 'surtitles',         3),
  ('accessibility', 'sign-language',     4),
  ('accessibility', 'feeling-tour',      5);

INSERT INTO tags (facet, slug, sort_order) VALUES
  ('language', 'dutch',       1),
  ('language', 'english',     2),
  ('language', 'no-language', 3);

INSERT INTO tag_translations (tag_id, language_code, label) VALUES
  -- discipline
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'nightlife'),    'en', 'Nightlife'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'nightlife'),    'nl', 'Nachtleven'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'talks'),        'en', 'Talks'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'talks'),        'nl', 'Lezingen'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'comedy'),       'en', 'Comedy'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'comedy'),       'nl', 'Comedy'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'spoken-word'),  'en', 'Spoken Word'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'spoken-word'),  'nl', 'Gesproken woord'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'circus'),       'en', 'Circus'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'circus'),       'nl', 'Circus'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'food'),         'en', 'Food'),
  ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'food'),         'nl', 'Food'),
  -- format
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'guest'),            'en', 'Guest production'),
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'guest'),            'nl', 'Gastvoorstelling'),
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'aftertalk'),        'en', 'With aftertalk'),
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'aftertalk'),        'nl', 'Met nagesprek'),
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'belgian-premiere'), 'en', 'Belgian premiere'),
  ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'belgian-premiere'), 'nl', 'Belgische première'),
  -- audience
  ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'family'),         'en', 'Family'),
  ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'family'),         'nl', 'Familie'),
  -- accessibility
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'audio-description'), 'en', 'With audio description'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'audio-description'), 'nl', 'Met audiodescriptie'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'relaxed'),           'en', 'Relaxed performance'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'relaxed'),           'nl', 'Relaxed performance'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'surtitles'),         'en', 'With surtitles'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'surtitles'),         'nl', 'Met boventiteling'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'sign-language'),     'en', 'With sign language interpreter'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'sign-language'),     'nl', 'Met tolk VGT'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'feeling-tour'),      'en', 'With feeling tour'),
  ((SELECT id FROM tags WHERE facet = 'accessibility' AND slug = 'feeling-tour'),      'nl', 'Met voeltoer'),
  -- language
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'dutch'),       'en', 'In Dutch'),
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'dutch'),       'nl', 'Nederlands gesproken'),
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'english'),     'en', 'In English'),
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'english'),     'nl', 'Engels gesproken'),
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'no-language'), 'en', 'No language'),
  ((SELECT id FROM tags WHERE facet = 'language' AND slug = 'no-language'), 'nl', 'Zonder taal');
