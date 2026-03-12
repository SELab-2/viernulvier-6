-- halls -> spaces
ALTER TABLE halls
DROP CONSTRAINT IF EXISTS halls_space_id_fkey;

ALTER TABLE halls
ADD CONSTRAINT halls_space_id_fkey
FOREIGN KEY (space_id)
REFERENCES spaces(id)
ON DELETE CASCADE;

-- spaces -> locations
ALTER TABLE spaces
DROP CONSTRAINT IF EXISTS spaces_location_id_fkey;

ALTER TABLE spaces
ADD CONSTRAINT spaces_location_id_fkey
FOREIGN KEY (location_id)
REFERENCES locations(id)
ON DELETE CASCADE;
