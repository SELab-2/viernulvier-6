CREATE TYPE collection_content_type AS ENUM ('production', 'event', 'blogpost');

CREATE TABLE locations (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,
    address    TEXT
);

CREATE TABLE halls (
    id          UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    location_id UUID        NOT NULL REFERENCES locations(id)
);

CREATE TABLE productions (
    id             UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    slug           TEXT        NOT NULL UNIQUE,

    title_nl       TEXT,
    title_en       TEXT,
    supertitle_nl  TEXT,
    supertitle_en  TEXT,
    -- separate from the production_artists join table
    artist_nl      TEXT,
    artist_en      TEXT,

    minimum_age    INTEGER,
    maximum_age    INTEGER,
    -- total run of the production (not individual event times)
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    -- 'live', 'online', 'mixed' etc.
    attendance_mode TEXT,
    vendor_id      TEXT
);

CREATE TABLE events (
    id              UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    intermission_at TIMESTAMPTZ,
    doors_at        TIMESTAMPTZ,
    cancelled       BOOLEAN     NOT NULL DEFAULT false,

    production_id   UUID        NOT NULL REFERENCES productions(id),
    location_id     UUID        REFERENCES locations(id),
    hall_id         UUID        REFERENCES halls(id),

    -- Kept for archive context but structure is TBD.
    -- May move to a separate prices table once usage is clear.
    prices          JSONB
);

CREATE TABLE artists (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE
);

CREATE TABLE production_artists (
    production_id UUID NOT NULL REFERENCES productions(id),
    artist_id     UUID NOT NULL REFERENCES artists(id),
    PRIMARY KEY (production_id, artist_id)
);

CREATE TABLE collections (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title_nl   TEXT        NOT NULL,
    title_en   TEXT        NOT NULL,
    note       TEXT
);

CREATE TABLE collection_items (
    id            UUID                    PRIMARY KEY DEFAULT uuidv7(),
    created_at    TIMESTAMPTZ             NOT NULL DEFAULT now(),
    collection_id UUID                    NOT NULL REFERENCES collections(id),
    content_id    UUID                    NOT NULL,
    content_type  collection_content_type NOT NULL,
    position      INTEGER                 NOT NULL
);

CREATE TABLE blogposts (
    id           UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    slug         TEXT        NOT NULL UNIQUE,
    title_nl     TEXT        NOT NULL,
    title_en     TEXT        NOT NULL,
    content_nl   TEXT        NOT NULL,
    content_en   TEXT        NOT NULL,
    author       TEXT        NOT NULL
);
