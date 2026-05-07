CREATE TABLE production_locations (
  production_id UUID NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  location_id   UUID NOT NULL REFERENCES locations(id)   ON DELETE CASCADE,
  PRIMARY KEY (production_id, location_id)
);
CREATE INDEX ON production_locations (location_id);
