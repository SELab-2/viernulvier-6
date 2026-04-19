-- add a column that is the joined string of all searchable columns
ALTER TABLE media
ADD COLUMN full_search_text text
GENERATED ALWAYS AS (immutable_concat_ws(' ',
    alt_text_nl, alt_text_en, alt_text_fr,
    description_nl, description_en, description_fr,
    s3_key
)) STORED;

-- create a GIN trigram index over that column
CREATE INDEX trgm_idx_media_search
ON media
USING GIN (full_search_text gin_trgm_ops);
