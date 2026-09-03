-- STAGING / NON-PRODUCTION ONLY
-- APPLY_THIS_SLICE = NO · production ALTER DEFAULT PRIVILEGES 0
-- Owner-scoped contract, measured 2026-09-02:
--   all 93 application public tables are owned by postgres.
--   postgres default public tables -> postgres + service_role (no anon/authenticated).
--   supabase_admin owns 0 application public tables and this SQL session cannot assume that managed role.
-- Therefore release readiness guards the actual app-object owner(s), and separately fails
-- if any unexpected owner starts owning a public application table.
--
-- Keep the app owner fail-closed. This is intentionally a no-op on current healthy state.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
