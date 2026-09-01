-- STAGING / NON-PRODUCTION ONLY
-- APPLY_THIS_SLICE = NO · production ALTER DEFAULT PRIVILEGES 0
-- Live (2026-09-01 read-only):
--   postgres default public tables → postgres + service_role
--   supabase_admin default public tables → postgres + anon + authenticated + service_role
-- Future public objects created by supabase_admin inherit anon/authenticated ALL.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
