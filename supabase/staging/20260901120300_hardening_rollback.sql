-- STAGING / NON-PRODUCTION ONLY
-- APPLY_THIS_SLICE = NO · PRODUCTION_ROLLBACK_EXECUTION = 0
-- Rollback target = fresh 2026-09-02 Production read-only pre-hardening snapshot.
-- This file exists only to rehearse reversibility on an isolated staging DB.
-- DO NOT copy into supabase/migrations and DO NOT apply to Production without Founder approval.

-- admin_audit_events pre-hardening state:
-- RLS enabled, not forced; no policies; service_role held all table privileges.
DROP TRIGGER IF EXISTS admin_audit_events_forbid_truncate ON public.admin_audit_events;
DROP FUNCTION IF EXISTS public.admin_audit_events_forbid_truncate();

REVOKE ALL ON TABLE public.admin_audit_events FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.admin_audit_events TO service_role;

-- push_control / push_subscriptions pre-hardening state:
-- RLS disabled, not forced; no policies; service_role held all table privileges.
DROP POLICY IF EXISTS push_control_deny_anon ON public.push_control;
DROP POLICY IF EXISTS push_control_deny_authenticated ON public.push_control;
DROP POLICY IF EXISTS push_subscriptions_deny_anon ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_deny_authenticated ON public.push_subscriptions;

ALTER TABLE public.push_control NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_control DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.push_control FROM service_role;
REVOKE ALL ON TABLE public.push_subscriptions FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.push_control TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.push_subscriptions TO service_role;

-- Default ACL rollback is intentionally absent here.
-- Fresh 2026-09-02 provider truth: all 93 application public tables are owned by postgres.
-- The normal SQL session cannot assume Supabase-managed role supabase_admin.
-- Owner-scoped default ACL handling is separated into PR #183; this table rollback
-- must remain executable in isolated staging without managed-role escalation.
