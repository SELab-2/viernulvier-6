ALTER TABLE locations   ADD CONSTRAINT locations_source_id_unique   UNIQUE (source_id);
ALTER TABLE halls       ADD CONSTRAINT halls_source_id_unique       UNIQUE (source_id);
ALTER TABLE productions ADD CONSTRAINT productions_source_id_unique UNIQUE (source_id);
ALTER TABLE events      ADD CONSTRAINT events_source_id_unique      UNIQUE (source_id);
ALTER TABLE spaces      ADD CONSTRAINT spaces_source_id_unique      UNIQUE (source_id);
