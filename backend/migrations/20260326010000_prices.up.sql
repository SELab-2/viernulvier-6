CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    source_id INTEGER UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    price_type TEXT NOT NULL,
    visibility TEXT NOT NULL,
    code TEXT,
    description_nl TEXT,
    description_en TEXT,
    minimum INTEGER NOT NULL,
    maximum INTEGER,
    step INTEGER NOT NULL,
    display_order INTEGER NOT NULL,
    auto_select_combo BOOLEAN NOT NULL,
    include_in_price_range BOOLEAN NOT NULL,
    cineville_box BOOLEAN NOT NULL,
    membership TEXT
);

CREATE TABLE price_ranks (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    source_id INTEGER UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    description_nl TEXT,
    description_en TEXT,
    code TEXT NOT NULL,
    position INTEGER NOT NULL,
    sold_out_buffer INTEGER
);

CREATE TABLE event_prices (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    source_id INTEGER UNIQUE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    price_id UUID NOT NULL REFERENCES prices(id),
    rank_id UUID NOT NULL REFERENCES price_ranks(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    available INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    box_office_id TEXT,
    contingent_id INTEGER,
    expires_at TIMESTAMPTZ
);
CREATE INDEX event_prices_event_id_idx ON event_prices(event_id);
CREATE INDEX event_prices_price_id_idx ON event_prices(price_id);
CREATE INDEX event_prices_rank_id_idx ON event_prices(rank_id);
