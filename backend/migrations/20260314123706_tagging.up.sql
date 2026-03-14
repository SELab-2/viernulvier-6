-- Arts archive — tags schema

--   - "facet" is the namespace (discipline, theme, format, …)
--   - "value" is the human label ("World premiere")
--   - "slug"  is the URL-safe version ("world-premiere")


-- facets: defines the available facet namespaces and which entity types they apply to.
CREATE TABLE facets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        NOT NULL UNIQUE,   -- 'discipline', 'theme', …
  label        text        NOT NULL,          -- 'Discipline', 'Theme', …
  description  text,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Which entity types a facet applies to.
-- e.g. 'discipline' applies to 'production' and 'artist',
--      but not to 'location'.
CREATE TABLE facet_entity_types (
  facet_id     uuid  NOT NULL REFERENCES facets(id) ON DELETE CASCADE,
  entity_type  text  NOT NULL,  -- 'production', 'article', 'artist', …
  PRIMARY KEY (facet_id, entity_type)
);


-- tags: the controlled vocabulary. Each tag belongs to a facet.
CREATE TABLE tags (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  facet_id     uuid        NOT NULL REFERENCES facets(id) ON DELETE RESTRICT,
  slug         text        NOT NULL,   -- 'world-premiere', 'memory', …
  label        text        NOT NULL,   -- 'World premiere', 'Memory', …
  description  text,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facet_id, slug)
);


-- taggings: Polymorphic join: any entity can be tagged. entity_type is the entity table name ('production', 'article', 'artist', 'picture').
CREATE TABLE taggings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id       uuid        NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL,
  entity_id    uuid        NOT NULL,
  inherited    boolean     NOT NULL DEFAULT false,
  -- true  = copied automatically from a linked entity
  -- false = set explicitly by an admin
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX ON taggings (entity_type, entity_id);
CREATE INDEX ON taggings (tag_id);
CREATE INDEX ON taggings (entity_type, entity_id, inherited);


-- Seed data: facets
INSERT INTO facets (slug, label, sort_order) VALUES
  ('discipline', 'Discipline', 1),
  ('format',     'Format',     2),
  ('theme',      'Theme',      3),
  ('audience',   'Audience',   4);

-- facet → entity type applicability
INSERT INTO facet_entity_types (facet_id, entity_type)
SELECT f.id, e.entity_type
FROM facets f
JOIN (VALUES
  ('discipline', 'production'),
  ('discipline', 'artist'),
  ('discipline', 'article'),
  ('format',     'production'),
  ('format',     'article'),
  ('theme',      'production'),
  ('theme',      'article'),
  ('audience',   'production'),
  ('audience',   'article')
) AS e(facet_slug, entity_type) ON f.slug = e.facet_slug;


-- =============================================================
-- Seed data — tags
-- =============================================================

-- discipline
INSERT INTO tags (facet_id, slug, label, sort_order)
SELECT f.id, v.slug, v.label, v.sort_order
FROM facets f,
(VALUES
  ('theatre',         'Theatre',         1),
  ('dance',           'Dance',           2),
  ('music',           'Music',           3),
  ('visual-art',      'Visual art',      4),
  ('film',            'Film',            5),
  ('opera',           'Opera',           6),
  ('performance-art', 'Performance art', 7),
  ('installation',    'Installation',    8)
) AS v(slug, label, sort_order)
WHERE f.slug = 'discipline';

-- format
INSERT INTO tags (facet_id, slug, label, sort_order)
SELECT f.id, v.slug, v.label, v.sort_order
FROM facets f,
(VALUES
  ('world-premiere', 'World premiere', 1),
  ('co-production',  'Co-production',  2),
  ('residency',      'Residency',      3),
  ('workshop',       'Workshop',       4),
  ('touring',        'Touring',        5),
  ('commission',     'Commission',     6),
  ('revival',        'Revival',        7),
  ('festival',       'Festival',       8)
) AS v(slug, label, sort_order)
WHERE f.slug = 'format';

-- theme
INSERT INTO tags (facet_id, slug, label, sort_order)
SELECT f.id, v.slug, v.label, v.sort_order
FROM facets f,
(VALUES
  ('identity', 'Identity', 1),
  ('memory',   'Memory',   2),
  ('politics', 'Politics', 3),
  ('ecology',  'Ecology',  4),
  ('diaspora', 'Diaspora', 5)
) AS v(slug, label, sort_order)
WHERE f.slug = 'theme';

-- audience
INSERT INTO tags (facet_id, slug, label, sort_order)
SELECT f.id, v.slug, v.label, v.sort_order
FROM facets f,
(VALUES
  ('all-ages',     'All ages',     1),
  ('children',     'Children',     2),
  ('adult',        'Adult',        3),
  ('professional', 'Professional', 4)
) AS v(slug, label, sort_order)
WHERE f.slug = 'audience';


-- Useful views

-- Flat view: tag with its facet info. For API serialisation
CREATE VIEW tags_with_facet AS
SELECT
  t.id,
  t.slug,
  t.label,
  t.description,
  t.sort_order,
  f.id   AS facet_id,
  f.slug AS facet_slug,
  f.label AS facet_label
FROM tags t
JOIN facets f ON f.id = t.facet_id;

-- per-entity tag summary — for listing tags on entity pages
CREATE VIEW entity_tags AS
SELECT
  tg.entity_type,
  tg.entity_id,
  tg.inherited,
  f.slug  AS facet_slug,
  f.label AS facet_label,
  t.slug  AS tag_slug,
  t.label AS tag_label,
  t.sort_order
FROM taggings tg
JOIN tags    t ON t.id = tg.tag_id
JOIN facets  f ON f.id = t.facet_id
ORDER BY f.sort_order, t.sort_order;
