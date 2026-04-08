ALTER TABLE collection_items
    ADD COLUMN comment_nl TEXT,
    ADD COLUMN comment_en TEXT;

UPDATE collection_items ci SET
    comment_nl = (SELECT comment FROM collection_item_translations WHERE collection_item_id = ci.id AND language_code = 'nl'),
    comment_en = (SELECT comment FROM collection_item_translations WHERE collection_item_id = ci.id AND language_code = 'en');

DROP TABLE collection_item_translations;

ALTER TABLE collections
    ADD COLUMN title_nl       TEXT NOT NULL DEFAULT '',
    ADD COLUMN title_en       TEXT NOT NULL DEFAULT '',
    ADD COLUMN description_nl TEXT NOT NULL DEFAULT '',
    ADD COLUMN description_en TEXT NOT NULL DEFAULT '';

UPDATE collections c SET
    title_nl       = COALESCE((SELECT title       FROM collection_translations WHERE collection_id = c.id AND language_code = 'nl'), ''),
    title_en       = COALESCE((SELECT title       FROM collection_translations WHERE collection_id = c.id AND language_code = 'en'), ''),
    description_nl = COALESCE((SELECT description FROM collection_translations WHERE collection_id = c.id AND language_code = 'nl'), ''),
    description_en = COALESCE((SELECT description FROM collection_translations WHERE collection_id = c.id AND language_code = 'en'), '');

DROP TABLE collection_translations;
