CREATE TABLE collection_translations (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL REFERENCES languages(code),
    title         TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (collection_id, language_code)
);

CREATE INDEX ON collection_translations (collection_id);

INSERT INTO collection_translations (collection_id, language_code, title, description)
SELECT id, 'nl', title_nl, description_nl FROM collections;

INSERT INTO collection_translations (collection_id, language_code, title, description)
SELECT id, 'en', title_en, description_en FROM collections;

ALTER TABLE collections
    DROP COLUMN title_nl,
    DROP COLUMN title_en,
    DROP COLUMN description_nl,
    DROP COLUMN description_en;

CREATE TABLE collection_item_translations (
    collection_item_id UUID NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
    language_code      TEXT NOT NULL REFERENCES languages(code),
    comment            TEXT,
    PRIMARY KEY (collection_item_id, language_code)
);

CREATE INDEX ON collection_item_translations (collection_item_id);

INSERT INTO collection_item_translations (collection_item_id, language_code, comment)
SELECT id, 'nl', comment_nl FROM collection_items;

INSERT INTO collection_item_translations (collection_item_id, language_code, comment)
SELECT id, 'en', comment_en FROM collection_items;

ALTER TABLE collection_items
    DROP COLUMN comment_nl,
    DROP COLUMN comment_en;
