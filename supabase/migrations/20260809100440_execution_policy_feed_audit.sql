-- Engine §48.13.3 · execution-policy feed + audit
-- SSOT: schemas/execution-policy.v1.json · nearMissCap Owns=execution-policy
-- FORBIDDEN: success_rate_percent / win_rate / rng_success columns

ALTER TABLE public.execution_policies
  ADD COLUMN IF NOT EXISTS feed jsonb NOT NULL DEFAULT '{"nearMissCapUsdt":"50"}'::jsonb;

ALTER TABLE public.execution_policies
  DROP CONSTRAINT IF EXISTS execution_policies_feed_nearmiss_chk;

ALTER TABLE public.execution_policies
  ADD CONSTRAINT execution_policies_feed_nearmiss_chk CHECK (
    feed ? 'nearMissCapUsdt'
    AND jsonb_typeof(feed->'nearMissCapUsdt') = 'string'
    AND length(feed->>'nearMissCapUsdt') >= 1
  );

COMMENT ON COLUMN public.execution_policies.feed IS
  'Engine §0.0.5.1 · feed.nearMissCapUsdt SSOT · adapters MUST NOT own';

COMMENT ON TABLE public.execution_policies IS
  'Admin singleton-ish active policy · matchStrictness→Rule map · successRatePercent FORBIDDEN';

CREATE TABLE IF NOT EXISTS public.execution_policy_audit (
  id bigserial PRIMARY KEY,
  policy_id uuid REFERENCES public.execution_policies (id),
  action text NOT NULL DEFAULT 'admin.execution_policy.updated'
    CHECK (action = 'admin.execution_policy.updated'),
  previous_payload jsonb NOT NULL,
  next_payload jsonb NOT NULL,
  changed_by_admin_id uuid NOT NULL,
  change_reason text NOT NULL CHECK (char_length(change_reason) >= 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execution_policy_audit_created_at_idx
  ON public.execution_policy_audit (created_at DESC);

COMMENT ON TABLE public.execution_policy_audit IS
  'Admin execution-policy before/after · §48.13.3 · observed KPI write path 0';

ALTER TABLE public.execution_policy_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS trade_executions_created_at_idx
  ON public.trade_executions (created_at DESC);
