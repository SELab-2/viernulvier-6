ALTER TABLE events
    RENAME COLUMN started_at TO start_time;

ALTER TABLE events
    RENAME COLUMN ended_at TO end_time;
