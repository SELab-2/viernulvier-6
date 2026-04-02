DROP TABLE articles_about_events;
DROP TABLE articles_about_locations;
DROP TABLE articles_about_artists;
DROP TABLE articles_about_productions;
ALTER TABLE production_artists DROP COLUMN role;
DROP TYPE artist_role;
