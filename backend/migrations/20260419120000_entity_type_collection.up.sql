-- Postgres cannot ALTER TYPE ... ADD VALUE inside a transaction block.
-- sqlx runs each migration file in its own transaction, so this file must
-- contain ONLY this single statement. IF NOT EXISTS makes re-run safe.
ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'collection';
