ALTER TABLE halls
DROP COLUMN space_id;

ALTER TABLE halls
ADD COLUMN location_id UUID NOT NULL REFERENCES locations(id);

