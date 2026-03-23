ALTER TABLE locations   DROP CONSTRAINT locations_source_id_unique;
ALTER TABLE halls       DROP CONSTRAINT halls_source_id_unique;
ALTER TABLE productions DROP CONSTRAINT productions_source_id_unique;
ALTER TABLE events      DROP CONSTRAINT events_source_id_unique;
ALTER TABLE spaces      DROP CONSTRAINT spaces_source_id_unique;
