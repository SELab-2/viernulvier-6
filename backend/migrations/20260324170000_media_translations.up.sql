ALTER TABLE media RENAME COLUMN alt_text TO alt_text_nl;
ALTER TABLE media ADD COLUMN alt_text_en VARCHAR;
ALTER TABLE media ADD COLUMN alt_text_fr VARCHAR;

ALTER TABLE media RENAME COLUMN description TO description_nl;
ALTER TABLE media ADD COLUMN description_en VARCHAR;
ALTER TABLE media ADD COLUMN description_fr VARCHAR;

ALTER TABLE media RENAME COLUMN credit TO credit_nl;
ALTER TABLE media ADD COLUMN credit_en VARCHAR;
ALTER TABLE media ADD COLUMN credit_fr VARCHAR;
