ALTER TABLE collections
    DROP COLUMN description_nl,
    DROP COLUMN description_en,
    ADD COLUMN note TEXT;

ALTER TABLE collection_items
    DROP COLUMN comment_nl,
    DROP COLUMN comment_en;
