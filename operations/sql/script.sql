-- ipv autoincrement integer gebruik UUID maar de moderne die temporal ordening toelaat

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    vendor_id TEXT, -- geen idee wat dit is
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    address TEXT -- some sort of address?
);

CREATE TABLE halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    location_id UUID NOT NULL REFERENCES locations(id)
);

CREATE TABLE productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    supertitle TEXT,
    artist TEXT,
    minimum_age INTEGER,
    maximum_age INTEGER,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    last_enrollment_at TIMESTAMP,
    notify_registration_email TEXT, -- in API, hier nodig?
    starts_at_description TEXT, -- ook geen idee
    vendor_id TEXT,
    box_office_id TEXT,
    performer_field TEXT, -- ?
    performer_type TEXT,
    attendance_mode TEXT -- in persoon of online
);

-- Collections for shareable lists of events, blogs and productions

CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title,
note,
    created_at
)

CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id (UUID)
    content_type (enum: 'production', 'event', 'blogpost')
    position -- ordering in the list
    created_at
)

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    started_at TIME,
    ended_at TIME,
    intermission_at TIME,
    doors_at TIME,
    box_office_id TEXT,
    vendor_id TEXT, -- what the fuck was this needed for
    max_tickets_per_order INTEGER, -- do we need this for archive?
    uitdatabank_id TEXT, -- is this needed?
    production_id UUID NOT NULL REFERENCES productions(id),
    location_id UUID REFERENCES locations(id),
    hall_id UUID REFERENCES halls(id),
    prices JSONB
);

CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE production_artists (
    production_id UUID NOT NULL REFERENCES productions(id),
    artist_id     UUID NOT NULL REFERENCES artists(id),
    PRIMARY KEY (production_id, artist_id)
);

CREATE TABLE blogposts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP NOT NULL DEFAULT now(),
    published_at TIMESTAMP,
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    author       TEXT NOT NULL
);
