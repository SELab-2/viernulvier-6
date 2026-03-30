ALTER TABLE collections
    DROP COLUMN note,
    ADD COLUMN description_nl TEXT NOT NULL DEFAULT '',
    ADD COLUMN description_en TEXT NOT NULL DEFAULT '';

ALTER TABLE collection_items
    ADD COLUMN comment_nl TEXT,
    ADD COLUMN comment_en TEXT;
