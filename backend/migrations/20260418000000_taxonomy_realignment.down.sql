-- Runs after 20260418000001.down.sql has deleted all rows with the new facet values.
-- PostgreSQL cannot DROP an enum value; recreate the type without the new entries.

CREATE TYPE facet_v1 AS ENUM ('discipline', 'format', 'theme', 'audience');

ALTER TABLE tags               ALTER COLUMN facet TYPE facet_v1 USING facet::text::facet_v1;
ALTER TABLE facet_entity_types ALTER COLUMN facet TYPE facet_v1 USING facet::text::facet_v1;
ALTER TABLE facet_labels       ALTER COLUMN facet TYPE facet_v1 USING facet::text::facet_v1;

DROP TYPE facet;
ALTER TYPE facet_v1 RENAME TO facet;
