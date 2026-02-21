-- ipv autoincrement integer gebruik UUID maar de moderne die temporal ordening toelaat

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    vendor_id TEXT, -- geen idee wat dit is
    name TEXT NOT NULL,
    address TEXT -- some sort of address?
);

CREATE TABLE halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    location_id UUID NOT NULL REFERENCES locations(id)
);

CREATE TABLE productions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    title TEXT NOT NULL,
    supertitle TEXT,
    artist TEXT,
    minimum_age INTEGER,
    maximum_age INTEGER,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    last_enrollment_at TIMESTAMP,
    notify_registration_email TEXT, -- in API, hier nodig?
    days_of_week TEXT, -- geen idee wat deze is
    starts_at_description TEXT, -- ook geen idee
    vendor_id TEXT,
    box_office_id TEXT,
    performer_field TEXT, -- ?
    performer_type TEXT,
    attendance_mode TEXT -- ?
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

--- ook mogelijk: single table inheritance / Base entity pattern. shared parent table with subtype tables.


CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    starts_at TIME,
    ends_at TIME,
    intermission_at TIME,
    doors_at TIME,
    box_office_id TEXT,
    vendor_id TEXT,
    max_tickets_per_order INTEGER,
    uitdatabank_id TEXT, -- is this needed?
    secure BOOLEAN, -- waarvoor bestaat dit in viernulvier API?
    production_id UUID NOT NULL REFERENCES productions(id),
    location_id UUID REFERENCES locations(id),
    hall_id UUID REFERENCES halls(id),
    prices JSONB
);
