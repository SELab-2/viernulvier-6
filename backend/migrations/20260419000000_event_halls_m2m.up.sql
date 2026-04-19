CREATE TABLE event_halls (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    hall_id  UUID NOT NULL REFERENCES halls(id)  ON DELETE CASCADE,
    PRIMARY KEY (event_id, hall_id)
);

INSERT INTO event_halls (event_id, hall_id)
SELECT id, hall_id FROM events WHERE hall_id IS NOT NULL;

ALTER TABLE events DROP COLUMN hall_id;
