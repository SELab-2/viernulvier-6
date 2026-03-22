CREATE TYPE collection_content_type AS ENUM ('production', 'event', 'blogpost');

CREATE TABLE locations (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    source_id  INTEGER, -- id's coming from the viernulvier marketing website: https://www.viernulvier.gent/api/docs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE,
    code TEXT,
    street TEXT,
    number TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT,
    phone_1 TEXT,
    phone_2 TEXT,
    is_owned_by_viernulvier BOOLEAN,
    uitdatabank_id TEXT
);

CREATE TABLE halls (
    id          UUID        PRIMARY KEY DEFAULT uuidv7(),
    source_id   INTEGER, -- id's coming from the viernulvier marketing website: https://www.viernulvier.gent/api/docs
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    vendor_id       TEXT, -- zijn quasi altijd namen van hall zelf
    box_office_id   TEXT,
    seat_selection  BOOLEAN,
    open_seating    BOOLEAN,

    name    TEXT        NOT NULL,
    remark  TEXT,
    slug    TEXT        NOT NULL UNIQUE,

    location_id UUID        NOT NULL REFERENCES locations(id)
);

CREATE TABLE productions (
    id             UUID        PRIMARY KEY DEFAULT uuidv7(),
    source_id   INTEGER, -- id's coming from the viernulvier marketing website: https://www.viernulvier.gent/api/docs
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    slug           TEXT        NOT NULL UNIQUE,

    title_nl       TEXT,
    title_en       TEXT,
    meta_title_nl TEXT,
    meta_title_en TEXT,
    supertitle_nl  TEXT,
    supertitle_en  TEXT,
    -- separate from the production_artists join table
    artist_nl      TEXT,
    artist_en      TEXT, -- FIX: referebce artist table

    minimum_age    INTEGER,
    maximum_age    INTEGER,
    -- total run of the production (not individual event times)
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    -- 'live', 'online', 'mixed' etc.
    attendance_mode TEXT, -- FIX: make enum?
    vendor_id      TEXT,

    description_nl TEXT,
    description_en TEXT,
    description_2_nl TEXT,
    description_2_en TEXT,
    description_extra_nl TEXT,
    description_extra_en TEXT,
    meta_description_nl TEXT,
    meta_description_en TEXT,
    teaser_en TEXT,
    teaser_nl TEXT,
    tagline_nl TEXT,
    tagline_en TEXT,

    video_1 TEXT,
    video_2 TEXT, -- FIX: wtf zijn deze 2
    quote_nl TEXT,
    quote_en TEXT,
    quote_source_nl TEXT,
    quote_source_en TEXT, -- TODO: does this need translation
    programme_nl TEXT,
    programme_en TEXT,
    info_nl TEXT,
    info_en TEXT,
    description_short_nl TEXT,
    description_short_en TEXT, -- FIX: can these be nullable, and if so, do we signal incomplete data in the CMS?

    eticket_info TEXT, -- FIX: ??
    -- custom_data TEXT, -- FIX: not in api
    -- genres TEXT, -- FIX: array of strings?
    -- uitdatabank_keywords TEXT, -- FIX: what should this be?
    uitdatabank_theme TEXT,
    uitdatabank_type TEXT
);

CREATE TABLE events (
    id              UUID        PRIMARY KEY DEFAULT uuidv7(),
    source_id   INTEGER, -- id's coming from the viernulvier marketing website: https://www.viernulvier.gent/api/docs
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    intermission_at TIMESTAMPTZ,
    doors_at        TIMESTAMPTZ,
    box_office_id TEXT,
    vendor_id TEXT,
    max_tickets_per_order INTEGER,
    uitdatabank_id TEXT,
    secure BOOLEAN,
    sms_verification BOOLEAN,
    status TEXT,
    order_url TEXT,

    production_id   UUID        NOT NULL REFERENCES productions(id),
    location_id     UUID        REFERENCES locations(id),
    hall_id         UUID        REFERENCES halls(id),

    -- Kept for archive context but structure is TBD.
    -- May move to a separate prices table once usage is clear.
    prices          JSONB
);

-- does not appear in viernulvier marketing API. Unique to our database
CREATE TABLE artists (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name       TEXT        NOT NULL,
    slug       TEXT        NOT NULL UNIQUE
);

-- does not appear in viernulvier marketing API. Unique to our database
CREATE TABLE production_artists (
    production_id UUID NOT NULL REFERENCES productions(id),
    artist_id     UUID NOT NULL REFERENCES artists(id),
    PRIMARY KEY (production_id, artist_id)
);

-- does not appear in viernulvier marketing API. Unique to our database. Represents shareable lists
CREATE TABLE collections (
    id         UUID        PRIMARY KEY DEFAULT uuidv7(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    title_nl   TEXT        NOT NULL,
    title_en   TEXT        NOT NULL,
    note       TEXT
);

-- does not appear in viernulvier marketing API. Unique to our database. Represents shareable lists
CREATE TABLE collection_items (
    id            UUID                    PRIMARY KEY DEFAULT uuidv7(),
    created_at    TIMESTAMPTZ             NOT NULL DEFAULT now(),
    collection_id UUID                    NOT NULL REFERENCES collections(id),
    content_id    UUID                    NOT NULL,
    content_type  collection_content_type NOT NULL,
    position      INTEGER                 NOT NULL
);

-- does not appear in viernulvier marketing API. Unique to our database.
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
