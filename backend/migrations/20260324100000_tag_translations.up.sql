CREATE TABLE tag_translations (
    tag_id        UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL REFERENCES languages(code),
    label         TEXT NOT NULL,
    description   TEXT,
    PRIMARY KEY (tag_id, language_code)
);

CREATE TABLE facet_labels (
    facet         facet NOT NULL,
    language_code TEXT  NOT NULL REFERENCES languages(code),
    label         TEXT  NOT NULL,
    PRIMARY KEY (facet, language_code)
);

INSERT INTO tag_translations (tag_id, language_code, label, description)
SELECT id, 'en', label, description FROM tags;

INSERT INTO tag_translations (tag_id, language_code, label) VALUES
    -- discipline
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'theatre'),         'nl', 'Theater'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'dance'),           'nl', 'Dans'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'music'),           'nl', 'Muziek'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'visual-art'),      'nl', 'Beeldende kunst'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'film'),            'nl', 'Film'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'opera'),           'nl', 'Opera'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'performance-art'), 'nl', 'Performancekunst'),
    ((SELECT id FROM tags WHERE facet = 'discipline' AND slug = 'installation'),    'nl', 'Installatie'),
    -- format
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'world-premiere'), 'nl', 'Wereldpremière'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'co-production'),  'nl', 'Coproductie'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'residency'),      'nl', 'Residentie'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'workshop'),       'nl', 'Workshop'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'touring'),        'nl', 'Tournee'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'commission'),     'nl', 'Opdracht'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'revival'),        'nl', 'Herneming'),
    ((SELECT id FROM tags WHERE facet = 'format' AND slug = 'festival'),       'nl', 'Festival'),
    -- theme
    ((SELECT id FROM tags WHERE facet = 'theme' AND slug = 'identity'), 'nl', 'Identiteit'),
    ((SELECT id FROM tags WHERE facet = 'theme' AND slug = 'memory'),   'nl', 'Herinnering'),
    ((SELECT id FROM tags WHERE facet = 'theme' AND slug = 'politics'), 'nl', 'Politiek'),
    ((SELECT id FROM tags WHERE facet = 'theme' AND slug = 'ecology'),  'nl', 'Ecologie'),
    ((SELECT id FROM tags WHERE facet = 'theme' AND slug = 'diaspora'), 'nl', 'Diaspora'),
    -- audience
    ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'all-ages'),     'nl', 'Alle leeftijden'),
    ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'children'),     'nl', 'Kinderen'),
    ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'adult'),        'nl', 'Volwassenen'),
    ((SELECT id FROM tags WHERE facet = 'audience' AND slug = 'professional'), 'nl', 'Professioneel');

INSERT INTO facet_labels (facet, language_code, label) VALUES
    ('discipline', 'en', 'Discipline'),
    ('format',     'en', 'Format'),
    ('theme',      'en', 'Theme'),
    ('audience',   'en', 'Audience'),
    ('discipline', 'nl', 'Discipline'),
    ('format',     'nl', 'Formaat'),
    ('theme',      'nl', 'Thema'),
    ('audience',   'nl', 'Publiek');

DROP VIEW entity_tags;

DROP FUNCTION facet_label(facet);

ALTER TABLE tags
    DROP COLUMN label,
    DROP COLUMN description;
