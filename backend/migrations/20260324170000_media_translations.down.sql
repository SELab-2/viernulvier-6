ALTER TABLE media DROP COLUMN alt_text_fr;
ALTER TABLE media DROP COLUMN alt_text_en;
ALTER TABLE media RENAME COLUMN alt_text_nl TO alt_text;

ALTER TABLE media DROP COLUMN description_fr;
ALTER TABLE media DROP COLUMN description_en;
ALTER TABLE media RENAME COLUMN description_nl TO description;

ALTER TABLE media DROP COLUMN credit_fr;
ALTER TABLE media DROP COLUMN credit_en;
ALTER TABLE media RENAME COLUMN credit_nl TO credit;
