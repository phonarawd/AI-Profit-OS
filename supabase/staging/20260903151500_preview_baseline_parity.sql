-- STAGING / NON-PRODUCTION ONLY
-- Restore the isolated Supabase preview to the current Production baseline
-- before the current production-db-hardening rehearsal.
-- Production mutation = 0. NEVER apply this file to Production.

-- Remove preview-only withdraw step-up drift.
DROP INDEX IF EXISTS public.withdraw_stepup_challenges_token_unspent_idx;
ALTER TABLE public.withdraw_stepup_challenges
  DROP COLUMN IF EXISTS token_consumed_at;

-- Roll back the prior staging push hardening so baseline parity can be proven.
DROP POLICY IF EXISTS push_control_deny_anon ON public.push_control;
DROP POLICY IF EXISTS push_control_deny_authenticated ON public.push_control;
DROP POLICY IF EXISTS push_subscriptions_deny_anon ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_deny_authenticated ON public.push_subscriptions;

ALTER TABLE public.push_control NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_control DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.push_control TO service_role;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;

-- Roll back the prior staging-only truncate hardening to match current Production.
DROP TRIGGER IF EXISTS admin_audit_events_forbid_truncate
  ON public.admin_audit_events;
DROP FUNCTION IF EXISTS public.admin_audit_events_forbid_truncate();
GRANT ALL ON TABLE public.admin_audit_events TO service_role;

-- Match current Production function authority exactly.
REVOKE ALL ON FUNCTION public.admin_audit_events_forbid_mutation()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_events_forbid_mutation()
  TO postgres, service_role;
