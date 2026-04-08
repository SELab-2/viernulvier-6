ALTER TABLE collection_items
    DROP CONSTRAINT collection_items_collection_id_fkey,
    ADD CONSTRAINT collection_items_collection_id_fkey
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE;
