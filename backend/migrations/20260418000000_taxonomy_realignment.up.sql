-- sqlx:no-transaction
-- ALTER TYPE ADD VALUE cannot be used alongside INSERTs that use the new value
-- in the same session. This migration commits only the enum additions so that
-- 20260418000001 runs on a fresh connection that can see the new values.

ALTER TYPE facet ADD VALUE 'accessibility' AFTER 'audience';
ALTER TYPE facet ADD VALUE 'language'      AFTER 'accessibility';
