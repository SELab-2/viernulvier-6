-- Arts archive — tags schema

--   - "facet" is the namespace (discipline, theme, format, …)
--   - "value" is the human label ("World premiere")
--   - "slug"  is the URL-safe version ("world-premiere")


-- facet enum: the fixed set of tag namespaces.
-- declaration order IS the sort order.
CREATE TYPE facet AS ENUM ('discipline', 'format', 'theme', 'audience');

-- Entity type enum: the set of entity types that can carry tags.
CREATE TYPE entity_type AS ENUM ('production', 'artist', 'article', 'media');

-- Helper: human label for each facet value
CREATE FUNCTION facet_label(f facet) RETURNS text
LANGUAGE sql IMMUTABLE RETURNS NULL ON NULL INPUT AS $$
  SELECT CASE f
    WHEN 'discipline' THEN 'Discipline'
    WHEN 'format'     THEN 'Format'
    WHEN 'theme'      THEN 'Theme'
    WHEN 'audience'   THEN 'Audience'
  END
$$;


-- which entity types a facet applies to.
-- example: 'discipline' applies to 'production' and 'artist', but not to 'location'.
CREATE TABLE facet_entity_types (
  facet        facet       NOT NULL,
  entity_type  entity_type NOT NULL,
  PRIMARY KEY (facet, entity_type)
);

CREATE INDEX ON facet_entity_types (entity_type, facet);


CREATE TABLE tags (
  id           uuid        PRIMARY KEY DEFAULT uuidv7(),
  facet        facet       NOT NULL,
  slug         text        NOT NULL,   -- 'world-premiere', 'memory', …
  label        text        NOT NULL,   -- 'World premiere', 'Memory', …
  description  text,
  sort_order   int         NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facet, slug),
  UNIQUE (facet, sort_order)
);


-- enforces that a tag's facet is applicable to the given entity type.
-- CHECK constraints can't use subqueries directly, so wrap in a STABLE function.
CREATE FUNCTION valid_tagging(p_tag_id uuid, p_entity_type entity_type) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tags t
    JOIN facet_entity_types fet ON fet.facet = t.facet
    WHERE t.id = p_tag_id AND fet.entity_type = p_entity_type
  )
$$;

-- taggings: any entity can be tagged.
CREATE TABLE taggings (
  id           uuid        PRIMARY KEY DEFAULT uuidv7(),
  tag_id       uuid        NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type  entity_type NOT NULL,
  entity_id    uuid        NOT NULL,
  inherited    boolean     NOT NULL DEFAULT true,
  -- true  = copied automatically from a linked entity
  -- false = set explicitly by an admin
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tag_id, entity_type, entity_id),
  CONSTRAINT valid_facet_entity_type CHECK (valid_tagging(tag_id, entity_type))
);

CREATE INDEX ON taggings (entity_type, entity_id);
CREATE INDEX ON taggings (tag_id);
CREATE INDEX ON taggings (entity_type, entity_id, inherited);


-- seed: facet → entity type applicability.
-- when deleting an entity, callers must DELETE FROM taggings WHERE entity_type = $1 AND entity_id = $2
INSERT INTO facet_entity_types (facet, entity_type) VALUES
  ('discipline', 'production'),
  ('discipline', 'artist'),
  ('discipline', 'article'),
  ('discipline', 'media'),
  ('format',     'production'),
  ('format',     'article'),
  ('theme',      'production'),
  ('theme',      'article'),
  ('theme',      'media'),
  ('audience',   'production'),
  ('audience',   'article'),
  ('audience',   'media');



INSERT INTO tags (facet, slug, label, sort_order) VALUES

  -- discipline
  ('discipline', 'theatre',         'Theatre',         1),
  ('discipline', 'dance',           'Dance',           2),
  ('discipline', 'music',           'Music',           3),
  ('discipline', 'visual-art',      'Visual art',      4),
  ('discipline', 'film',            'Film',            5),
  ('discipline', 'opera',           'Opera',           6),
  ('discipline', 'performance-art', 'Performance art', 7),
  ('discipline', 'installation',    'Installation',    8),

  -- format
  ('format', 'world-premiere', 'World premiere', 1),
  ('format', 'co-production',  'Co-production',  2),
  ('format', 'residency',      'Residency',      3),
  ('format', 'workshop',       'Workshop',       4),
  ('format', 'touring',        'Touring',        5),
  ('format', 'commission',     'Commission',     6),
  ('format', 'revival',        'Revival',        7),
  ('format', 'festival',       'Festival',       8),

  -- theme
  ('theme', 'identity', 'Identity', 1),
  ('theme', 'memory',   'Memory',   2),
  ('theme', 'politics', 'Politics', 3),
  ('theme', 'ecology',  'Ecology',  4),
  ('theme', 'diaspora', 'Diaspora', 5),

  -- audience
  ('audience', 'all-ages',     'All ages',     1),
  ('audience', 'children',     'Children',     2),
  ('audience', 'adult',        'Adult',        3),
  ('audience', 'professional', 'Professional', 4);


-- per-entity tag summary. for listing tags on entity pages
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
ORDER BY t.facet, t.sort_order;  -- enum declaration order, then tag sort_order
