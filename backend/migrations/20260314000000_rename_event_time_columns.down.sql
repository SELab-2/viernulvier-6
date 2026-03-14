ALTER TABLE events
    RENAME COLUMN start_time TO started_at;

ALTER TABLE events
    RENAME COLUMN end_time TO ended_at;
