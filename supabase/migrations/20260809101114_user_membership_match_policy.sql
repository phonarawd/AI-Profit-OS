-- Engine §0.0.7 / Admin §9.8.10 — membership force audit · match-policy override fields · fulfillRate display-only
-- FORBIDDEN: success_rate_percent column · fulfill_rate as Rule input

-- Align user_match_policy_overrides ↔ schemas/user-match-policy-override.v1.json
ALTER TABLE public.user_match_policy_overrides
  ADD COLUMN IF NOT EXISTS min_profit_usdt numeric(36, 18),
  ADD COLUMN IF NOT EXISTS stale_allowance_sec integer,
  ADD COLUMN IF NOT EXISTS max_rematch_count integer,
  ADD COLUMN IF NOT EXISTS daily_user_match_cap integer;

ALTER TABLE public.user_match_policy_overrides
  DROP CONSTRAINT IF EXISTS user_match_policy_overrides_stale_chk;

ALTER TABLE public.user_match_policy_overrides
  ADD CONSTRAINT user_match_policy_overrides_stale_chk
  CHECK (stale_allowance_sec IS NULL OR stale_allowance_sec >= 0);

ALTER TABLE public.user_match_policy_overrides
  DROP CONSTRAINT IF EXISTS user_match_policy_overrides_rematch_chk;

ALTER TABLE public.user_match_policy_overrides
  ADD CONSTRAINT user_match_policy_overrides_rematch_chk
  CHECK (max_rematch_count IS NULL OR max_rematch_count >= 0);

ALTER TABLE public.user_match_policy_overrides
  DROP CONSTRAINT IF EXISTS user_match_policy_overrides_daily_cap_chk;

ALTER TABLE public.user_match_policy_overrides
  ADD CONSTRAINT user_match_policy_overrides_daily_cap_chk
  CHECK (daily_user_match_cap IS NULL OR daily_user_match_cap >= 0);

COMMENT ON TABLE public.user_match_policy_overrides IS
  'Admin §9.8.10 user.matchStrictnessOverride · merge order 3 after membership×band overlay · NEVER successRatePercent';
COMMENT ON COLUMN public.user_match_policy_overrides.min_profit_usdt IS
  'custom override field · preset rows store expanded map values';

-- Membership force audit
CREATE TABLE IF NOT EXISTS public.user_membership_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('admin.user.membership.force')),
  before_json jsonb,
  after_json jsonb,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_membership_audit_user_id_idx
  ON public.user_membership_audit (user_id, created_at DESC);

COMMENT ON TABLE public.user_membership_audit IS
  'Admin §9.8.10 membership force · auto demote path 0 · Engine §0.0.7';

-- Match policy override audit
CREATE TABLE IF NOT EXISTS public.user_match_policy_override_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('admin.user.match_policy.updated')),
  before_json jsonb,
  after_json jsonb,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_match_policy_override_audit_user_id_idx
  ON public.user_match_policy_override_audit (user_id, created_at DESC);

COMMENT ON TABLE public.user_match_policy_override_audit IS
  'Admin §9.8.10 matchStrictnessOverride changes · observed KPI write 0';

COMMENT ON COLUMN public.user_membership.fulfill_rate_7d IS
  'Display-only KPI (요즘 조건이 맞은 비율) · NEVER Rule / participate input';

-- RLS (service_role Nest path · anon denied)
ALTER TABLE public.user_membership_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_match_policy_override_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_membership_audit_deny_all ON public.user_membership_audit;
CREATE POLICY user_membership_audit_deny_all ON public.user_membership_audit
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS user_match_policy_override_audit_deny_all ON public.user_match_policy_override_audit;
CREATE POLICY user_match_policy_override_audit_deny_all ON public.user_match_policy_override_audit
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
