CREATE TABLE internal_state (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO internal_state (key, value)
VALUES ('last_api_update', '2000-01-01T00:00:00Z');

CREATE TRIGGER update_internal_state_updated_at
BEFORE UPDATE ON internal_state
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
