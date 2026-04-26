-- Postgres does not support removing values from an enum type.
-- This is a forward-only migration; the down file is intentionally a no-op.
-- To undo, drop and recreate the enum with all dependent tables, which is
-- outside the scope of an automated rollback.
SELECT 1;
