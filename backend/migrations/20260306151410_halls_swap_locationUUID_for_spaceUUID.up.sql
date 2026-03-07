ALTER TABLE halls
DROP COLUMN location_id;

ALTER TABLE halls
ADD COLUMN space_id UUID REFERENCES spaces(id);
