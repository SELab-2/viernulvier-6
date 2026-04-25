ALTER TABLE events ADD COLUMN hall_id UUID REFERENCES halls(id);

UPDATE events e
SET hall_id = (
    SELECT hall_id FROM event_halls WHERE event_id = e.id LIMIT 1
);

DROP TABLE event_halls;
