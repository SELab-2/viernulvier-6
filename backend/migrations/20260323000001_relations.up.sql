-- entity relations schema
--
-- if the thing you're pointing at has its own page, it's a relation.
--
-- Relations:
--   production - artist (role belongs to the edge, not either entity)
--   articles_about_productions
--   articles_about_artists
--   articles_about_locations
--   articles_about_events
--   NOT: artist - location


CREATE TYPE artist_role AS ENUM (
    'director',
    'performer',
    'choreographer',
    'composer',
    'dramaturg',
    'set_designer',
    'lighting_designer',
    'sound_designer',
    'costume_designer',
    'video_designer',
    'musician',
    'writer',
    'producer'
);

ALTER TABLE production_artists ADD COLUMN role artist_role;
CREATE INDEX ON production_artists (artist_id);


CREATE TABLE articles_about_productions (
    article_id    UUID NOT NULL REFERENCES blogposts(id)   ON DELETE CASCADE,
    production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, production_id)
);

CREATE INDEX ON articles_about_productions (production_id);


CREATE TABLE articles_about_artists (
    article_id UUID NOT NULL REFERENCES blogposts(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, artist_id)
);

CREATE INDEX ON articles_about_artists (artist_id);


CREATE TABLE articles_about_locations (
    article_id  UUID NOT NULL REFERENCES blogposts(id)  ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, location_id)
);

CREATE INDEX ON articles_about_locations (location_id);


CREATE TABLE articles_about_events (
    article_id UUID NOT NULL REFERENCES blogposts(id) ON DELETE CASCADE,
    event_id   UUID NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (article_id, event_id)
);

CREATE INDEX ON articles_about_events (event_id);
