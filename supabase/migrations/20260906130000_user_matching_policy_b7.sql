-- S3 / B7 유저별 상품 노출·참여 정책 (versioned)
-- 매칭 수익 장부·SYS:OPPORTUNITY_POOL 예약과 다른 층. 금액 컬럼 조작 0.
-- Additive · RLS deny-all · production apply 는 S5 staging 이후.

CREATE TABLE IF NOT EXISTS public.matching_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('platform', 'group', 'user')),
  subject_id uuid,
  group_key text,
  version integer NOT NULL CHECK (version >= 1),
  status text NOT NULL CHECK (status IN ('active', 'superseded')),
  visibility_min_usdt numeric(36, 18),
  visibility_max_usdt numeric(36, 18),
  participate_min_usdt numeric(36, 18),
  participate_max_usdt numeric(36, 18),
  allow_categories text[],
  deny_categories text[],
  allow_brands text[],
  deny_brands text[],
  allow_providers text[],
  deny_providers text[],
  allow_marketplaces text[],
  deny_marketplaces text[],
  allow_countries text[],
  deny_countries text[],
  allow_currencies text[],
  deny_currencies text[],
  auto_match_allowed boolean,
  manual_assign_only boolean,
  prefer_new_listings boolean,
  max_concurrent_trades integer CHECK (max_concurrent_trades IS NULL OR max_concurrent_trades >= 0),
  daily_participate_count integer CHECK (daily_participate_count IS NULL OR daily_participate_count >= 0),
  daily_participate_amount_usdt numeric(36, 18),
  matching_paused boolean NOT NULL DEFAULT false,
  effective_from timestamptz,
  effective_until timestamptz,
  reason text NOT NULL CHECK (char_length(reason) >= 8),
  internal_ref text,
  request_id text,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matching_policy_subject_chk CHECK (
    (scope = 'platform' AND subject_id IS NULL AND group_key IS NULL)
    OR (scope = 'group' AND group_key IS NOT NULL)
    OR (scope = 'user' AND subject_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS matching_policy_active_user_uq
  ON public.matching_policy_versions (subject_id)
  WHERE scope = 'user' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS matching_policy_active_group_uq
  ON public.matching_policy_versions (group_key)
  WHERE scope = 'group' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS matching_policy_active_platform_uq
  ON public.matching_policy_versions ((1))
  WHERE scope = 'platform' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS matching_policy_request_uq
  ON public.matching_policy_versions (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS matching_policy_versions_user_idx
  ON public.matching_policy_versions (subject_id, created_at DESC)
  WHERE scope = 'user';

COMMENT ON TABLE public.matching_policy_versions IS
  'B7 versioned visibility/eligibility policy. New version supersedes. Does not change opportunity money fields.';

CREATE TABLE IF NOT EXISTS public.matching_policy_group_members (
  group_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_key, user_id)
);

CREATE INDEX IF NOT EXISTS matching_policy_group_members_user_idx
  ON public.matching_policy_group_members (user_id);

COMMENT ON TABLE public.matching_policy_group_members IS
  'B7 explicit group membership (vip_ops_test 등). Derived groups (kakao/new_signup) are evaluated in Nest.';

CREATE TABLE IF NOT EXISTS public.matching_policy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id),
  kind text NOT NULL CHECK (kind IN ('include', 'exclude')),
  reason text NOT NULL CHECK (char_length(reason) >= 8),
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id, kind)
);

CREATE INDEX IF NOT EXISTS matching_policy_assignments_user_idx
  ON public.matching_policy_assignments (user_id);

COMMENT ON TABLE public.matching_policy_assignments IS
  'B7 include/exclude only. Forbidden: source price, FX, requiredCapitalUsdt, profit, journal.';

CREATE TABLE IF NOT EXISTS public.matching_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_role text,
  target_user_id uuid,
  action text NOT NULL,
  before_policy jsonb,
  after_policy jsonb,
  reason text NOT NULL,
  internal_ref text,
  request_id text,
  success boolean NOT NULL,
  affected_opportunity_count integer,
  affected_trade_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matching_policy_audit_user_idx
  ON public.matching_policy_audit (target_user_id, created_at DESC);

COMMENT ON TABLE public.matching_policy_audit IS
  'B7 append-only policy audit. Revert = new version, never delete.';

ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS matching_policy_id text,
  ADD COLUMN IF NOT EXISTS matching_policy_version integer,
  ADD COLUMN IF NOT EXISTS matching_policy_source text,
  ADD COLUMN IF NOT EXISTS required_capital_usdt_snapshot numeric(36, 18);

COMMENT ON COLUMN public.trade_executions.matching_policy_id IS
  'B7 policy snapshot at participate. Later policy changes do not rewrite this trade.';
COMMENT ON COLUMN public.trade_executions.required_capital_usdt_snapshot IS
  'B7 amount snapshot. Must equal opportunity.required_capital_usdt at insert.';

ALTER TABLE public.matching_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_group_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_policy_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.matching_policy_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.matching_policy_group_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.matching_policy_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.matching_policy_audit FROM anon, authenticated;
