-- PUTDUK PHASE 02 — mining foundation v1
-- Additive schema only. Existing ledger remains financial source of truth.

-- ---------------------------------------------------------------------------
-- 1. Extend existing ledger vocabulary for mining without creating a new balance.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ledger_accounts
  DROP CONSTRAINT IF EXISTS ledger_accounts_account_kind_check;

ALTER TABLE public.ledger_accounts
  ADD CONSTRAINT ledger_accounts_account_kind_check
  CHECK (account_kind = ANY (ARRAY[
    'user_bucket'::text,
    'opportunity_pool'::text,
    'mining_pool'::text,
    'ops_pool'::text,
    'promo_pool'::text,
    'treasury'::text,
    'fee_revenue'::text,
    'fx_clearing'::text,
    'suspense'::text
  ]));

ALTER TABLE public.ledger_journals
  DROP CONSTRAINT IF EXISTS ledger_journals_journal_type_check;

ALTER TABLE public.ledger_journals
  ADD CONSTRAINT ledger_journals_journal_type_check
  CHECK (journal_type = ANY (ARRAY[
    'deposit_usdt'::text,
    'deposit_krw'::text,
    'withdraw'::text,
    'withdraw_refund'::text,
    'participate_lock'::text,
    'participate_unlock'::text,
    'settlement'::text,
    'merge_profit_to_principal'::text,
    'admin_adjust'::text,
    'referral_reward'::text,
    'referral_clawback'::text,
    'practice_grant'::text,
    'practice_expire'::text,
    'mission_reward'::text,
    'mission_clawback'::text,
    'trial_grant'::text,
    'mine_position_lock'::text,
    'mine_position_unlock'::text,
    'mine_profit_settlement'::text,
    'fee'::text,
    'other'::text
  ]));

INSERT INTO public.ledger_accounts (
  code, owner_type, owner_user_id, account_kind, bucket, currency, balance_usdt
) VALUES (
  'SYS:MINING_POOL', 'system', NULL, 'mining_pool', NULL, 'USDT', 0
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Common updated_at trigger for mutable mining aggregate tables.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mine_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mine catalog.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  asset_code text NOT NULL,
  status text NOT NULL DEFAULT 'READY',
  principal_currency text NOT NULL DEFAULT 'USDT',
  min_position_usdt numeric(36,18),
  max_position_usdt numeric(36,18),
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  ended_at timestamptz,
  created_by_admin_id uuid REFERENCES public.admin_rbac(admin_id) ON DELETE SET NULL,
  updated_by_admin_id uuid REFERENCES public.admin_rbac(admin_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mines_code_chk CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  CONSTRAINT mines_display_name_chk CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 100),
  CONSTRAINT mines_asset_code_chk CHECK (char_length(btrim(asset_code)) BETWEEN 1 AND 64),
  CONSTRAINT mines_status_chk CHECK (status = ANY (ARRAY['READY','ACTIVE','NEW_POSITIONS_PAUSED','PAUSED','ENDED']::text[])),
  CONSTRAINT mines_currency_chk CHECK (principal_currency = 'USDT'),
  CONSTRAINT mines_min_position_chk CHECK (min_position_usdt IS NULL OR min_position_usdt > 0),
  CONSTRAINT mines_max_position_chk CHECK (max_position_usdt IS NULL OR max_position_usdt > 0),
  CONSTRAINT mines_min_max_chk CHECK (min_position_usdt IS NULL OR max_position_usdt IS NULL OR min_position_usdt <= max_position_usdt),
  CONSTRAINT mines_ended_time_chk CHECK (ended_at IS NULL OR ended_at >= created_at)
);

CREATE INDEX mines_status_order_idx ON public.mines(status, display_order, created_at);

CREATE TRIGGER mines_set_updated_at
  BEFORE UPDATE ON public.mines
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Versioned mine rates with maker/checker traceability.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_rate_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mine_id uuid NOT NULL REFERENCES public.mines(id) ON DELETE RESTRICT,
  version_no integer NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  daily_rate numeric(36,18) NOT NULL,
  effective_at timestamptz,
  ended_at timestamptz,
  approval_requested_at timestamptz,
  approved_at timestamptz,
  approval_request_id uuid REFERENCES public.admin_approval_requests(id) ON DELETE SET NULL,
  created_by_admin_id uuid REFERENCES public.admin_rbac(admin_id) ON DELETE SET NULL,
  approved_by_admin_id uuid REFERENCES public.admin_rbac(admin_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_rate_versions_version_chk CHECK (version_no > 0),
  CONSTRAINT mine_rate_versions_status_chk CHECK (status = ANY (ARRAY['DRAFT','APPROVAL_PENDING','SCHEDULED','ACTIVE','ENDED']::text[])),
  CONSTRAINT mine_rate_versions_rate_chk CHECK (daily_rate >= 0),
  CONSTRAINT mine_rate_versions_window_chk CHECK (ended_at IS NULL OR effective_at IS NULL OR ended_at > effective_at),
  CONSTRAINT mine_rate_versions_checker_chk CHECK (approved_by_admin_id IS NULL OR created_by_admin_id IS NULL OR approved_by_admin_id <> created_by_admin_id),
  CONSTRAINT mine_rate_versions_schedule_chk CHECK (status NOT IN ('SCHEDULED','ACTIVE','ENDED') OR effective_at IS NOT NULL),
  CONSTRAINT mine_rate_versions_approval_chk CHECK (status NOT IN ('SCHEDULED','ACTIVE','ENDED') OR approved_at IS NOT NULL),
  CONSTRAINT mine_rate_versions_mine_version_uq UNIQUE (mine_id, version_no),
  CONSTRAINT mine_rate_versions_id_mine_uq UNIQUE (id, mine_id)
);

CREATE UNIQUE INDEX mine_rate_versions_one_active_idx
  ON public.mine_rate_versions(mine_id)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX mine_rate_versions_effective_uq
  ON public.mine_rate_versions(mine_id, effective_at)
  WHERE effective_at IS NOT NULL;

CREATE INDEX mine_rate_versions_mine_status_idx
  ON public.mine_rate_versions(mine_id, status, effective_at DESC NULLS LAST);

CREATE TRIGGER mine_rate_versions_set_updated_at
  BEFORE UPDATE ON public.mine_rate_versions
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Position aggregate. Money authority remains ledger; this is operating state.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  mine_id uuid NOT NULL REFERENCES public.mines(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'START_PENDING',
  requested_principal_usdt numeric(36,18) NOT NULL,
  principal_usdt numeric(36,18) NOT NULL DEFAULT 0,
  start_idempotency_key text NOT NULL UNIQUE,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_positions_status_chk CHECK (status = ANY (ARRAY['START_PENDING','ACTIVE','DECREASE_PENDING','END_PENDING','ENDED']::text[])),
  CONSTRAINT mine_positions_requested_chk CHECK (requested_principal_usdt > 0),
  CONSTRAINT mine_positions_principal_chk CHECK (principal_usdt >= 0),
  CONSTRAINT mine_positions_active_principal_chk CHECK (status <> 'ACTIVE' OR principal_usdt > 0),
  CONSTRAINT mine_positions_ended_principal_chk CHECK (status <> 'ENDED' OR principal_usdt = 0),
  CONSTRAINT mine_positions_time_chk CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CONSTRAINT mine_positions_scope_uq UNIQUE (id, user_id, mine_id)
);

CREATE UNIQUE INDEX mine_positions_one_open_per_user_mine_idx
  ON public.mine_positions(user_id, mine_id)
  WHERE status <> 'ENDED';

CREATE INDEX mine_positions_user_status_idx
  ON public.mine_positions(user_id, status, created_at DESC);
CREATE INDEX mine_positions_mine_status_idx
  ON public.mine_positions(mine_id, status, created_at DESC);

CREATE TRIGGER mine_positions_set_updated_at
  BEFORE UPDATE ON public.mine_positions
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Immutable position money events. This preserves exact increase/decrease edges.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_position_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES public.mine_positions(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  amount_usdt numeric(36,18) NOT NULL,
  principal_before_usdt numeric(36,18) NOT NULL,
  principal_after_usdt numeric(36,18) NOT NULL,
  effective_at timestamptz NOT NULL,
  ledger_journal_id uuid NOT NULL UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_position_events_type_chk CHECK (event_type = ANY (ARRAY['START','INCREASE','DECREASE','END']::text[])),
  CONSTRAINT mine_position_events_amount_chk CHECK (amount_usdt > 0),
  CONSTRAINT mine_position_events_before_chk CHECK (principal_before_usdt >= 0),
  CONSTRAINT mine_position_events_after_chk CHECK (principal_after_usdt >= 0),
  CONSTRAINT mine_position_events_math_chk CHECK (
    (event_type = 'START' AND principal_before_usdt = 0 AND principal_after_usdt = amount_usdt)
    OR
    (event_type = 'INCREASE' AND principal_after_usdt = principal_before_usdt + amount_usdt)
    OR
    (event_type = 'DECREASE' AND principal_before_usdt > amount_usdt AND principal_after_usdt = principal_before_usdt - amount_usdt)
    OR
    (event_type = 'END' AND principal_before_usdt = amount_usdt AND principal_after_usdt = 0)
  )
);

CREATE INDEX mine_position_events_position_time_idx
  ON public.mine_position_events(position_id, effective_at, created_at);

CREATE TRIGGER mine_position_events_immutable
  BEFORE UPDATE OR DELETE ON public.mine_position_events
  FOR EACH ROW EXECUTE FUNCTION public.ledger_forbid_mutation();

-- ---------------------------------------------------------------------------
-- 7. Immutable accrual segments. Each segment binds position + rate + exact window.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mine_id uuid NOT NULL,
  rate_version_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  principal_usdt numeric(36,18) NOT NULL,
  daily_rate numeric(36,18) NOT NULL,
  accrued_profit_usdt numeric(36,18) NOT NULL,
  calc_version text NOT NULL,
  calc_fingerprint text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_accruals_position_scope_fk FOREIGN KEY (position_id, user_id, mine_id)
    REFERENCES public.mine_positions(id, user_id, mine_id) ON DELETE RESTRICT,
  CONSTRAINT mine_accruals_rate_scope_fk FOREIGN KEY (rate_version_id, mine_id)
    REFERENCES public.mine_rate_versions(id, mine_id) ON DELETE RESTRICT,
  CONSTRAINT mine_accruals_window_chk CHECK (period_end > period_start),
  CONSTRAINT mine_accruals_principal_chk CHECK (principal_usdt > 0),
  CONSTRAINT mine_accruals_rate_chk CHECK (daily_rate >= 0),
  CONSTRAINT mine_accruals_profit_chk CHECK (accrued_profit_usdt >= 0),
  CONSTRAINT mine_accruals_version_chk CHECK (char_length(btrim(calc_version)) BETWEEN 1 AND 64),
  CONSTRAINT mine_accruals_interval_uq UNIQUE (position_id, period_start, period_end, rate_version_id),
  CONSTRAINT mine_accruals_id_position_uq UNIQUE (id, position_id)
);

CREATE INDEX mine_accruals_position_period_idx
  ON public.mine_accruals(position_id, period_start, period_end);
CREATE INDEX mine_accruals_user_period_idx
  ON public.mine_accruals(user_id, period_end DESC);

CREATE TRIGGER mine_accruals_immutable
  BEFORE UPDATE OR DELETE ON public.mine_accruals
  FOR EACH ROW EXECUTE FUNCTION public.ledger_forbid_mutation();

-- ---------------------------------------------------------------------------
-- 8. Settlement aggregate and immutable accrual assignment.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mine_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'CALC_PENDING',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  calculated_profit_usdt numeric(36,18) NOT NULL DEFAULT 0,
  credited_profit_usdt numeric(36,18) NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE,
  ledger_journal_id uuid UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
  attempt_count integer NOT NULL DEFAULT 0,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_settlements_position_scope_fk FOREIGN KEY (position_id, user_id, mine_id)
    REFERENCES public.mine_positions(id, user_id, mine_id) ON DELETE RESTRICT,
  CONSTRAINT mine_settlements_status_chk CHECK (status = ANY (ARRAY['CALC_PENDING','CALCULATED','LEDGER_POSTED','FAILED','REVIEW_REQUIRED']::text[])),
  CONSTRAINT mine_settlements_window_chk CHECK (period_end > period_start),
  CONSTRAINT mine_settlements_calc_profit_chk CHECK (calculated_profit_usdt >= 0),
  CONSTRAINT mine_settlements_credit_profit_chk CHECK (credited_profit_usdt >= 0),
  CONSTRAINT mine_settlements_attempt_chk CHECK (attempt_count >= 0),
  CONSTRAINT mine_settlements_ledger_state_chk CHECK (status <> 'LEDGER_POSTED' OR ledger_journal_id IS NOT NULL),
  CONSTRAINT mine_settlements_credit_exact_chk CHECK (status <> 'LEDGER_POSTED' OR credited_profit_usdt = calculated_profit_usdt),
  CONSTRAINT mine_settlements_interval_uq UNIQUE (position_id, period_start, period_end),
  CONSTRAINT mine_settlements_id_position_uq UNIQUE (id, position_id)
);

CREATE INDEX mine_settlements_user_status_idx
  ON public.mine_settlements(user_id, status, period_end DESC);
CREATE INDEX mine_settlements_status_period_idx
  ON public.mine_settlements(status, period_end);

CREATE TRIGGER mine_settlements_set_updated_at
  BEFORE UPDATE ON public.mine_settlements
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

CREATE TABLE public.mine_settlement_accruals (
  settlement_id uuid NOT NULL,
  accrual_id uuid NOT NULL UNIQUE,
  position_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (settlement_id, accrual_id),
  CONSTRAINT mine_settlement_accruals_settlement_scope_fk FOREIGN KEY (settlement_id, position_id)
    REFERENCES public.mine_settlements(id, position_id) ON DELETE RESTRICT,
  CONSTRAINT mine_settlement_accruals_accrual_scope_fk FOREIGN KEY (accrual_id, position_id)
    REFERENCES public.mine_accruals(id, position_id) ON DELETE RESTRICT
);

CREATE INDEX mine_settlement_accruals_position_idx
  ON public.mine_settlement_accruals(position_id, settlement_id);

CREATE TRIGGER mine_settlement_accruals_immutable
  BEFORE UPDATE OR DELETE ON public.mine_settlement_accruals
  FOR EACH ROW EXECUTE FUNCTION public.ledger_forbid_mutation();

-- ---------------------------------------------------------------------------
-- 9. Trial mining session. Trial money remains in existing trial ledger buckets.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_trial_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  mine_id uuid NOT NULL REFERENCES public.mines(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  principal_usdt numeric(36,18) NOT NULL,
  accrued_profit_usdt numeric(36,18) NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE,
  trial_grant_id uuid UNIQUE REFERENCES public.trial_grants(id) ON DELETE SET NULL,
  lock_journal_id uuid UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
  unlock_journal_id uuid UNIQUE REFERENCES public.ledger_journals(id) ON DELETE RESTRICT,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_trial_sessions_status_chk CHECK (status = ANY (ARRAY['NOT_STARTED','ACTIVE','COMPLETED','EXPIRED']::text[])),
  CONSTRAINT mine_trial_sessions_principal_chk CHECK (principal_usdt > 0),
  CONSTRAINT mine_trial_sessions_profit_chk CHECK (accrued_profit_usdt >= 0),
  CONSTRAINT mine_trial_sessions_expiry_chk CHECK (expires_at IS NULL OR started_at IS NULL OR expires_at > started_at),
  CONSTRAINT mine_trial_sessions_completed_chk CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE UNIQUE INDEX mine_trial_sessions_one_active_user_idx
  ON public.mine_trial_sessions(user_id)
  WHERE status = 'ACTIVE';
CREATE INDEX mine_trial_sessions_user_status_idx
  ON public.mine_trial_sessions(user_id, status, created_at DESC);

CREATE TRIGGER mine_trial_sessions_set_updated_at
  BEFORE UPDATE ON public.mine_trial_sessions
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. High-value review. Threshold is snapshotted, never hardcoded in this table.
-- ---------------------------------------------------------------------------
CREATE TABLE public.mine_high_value_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  mine_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  requested_principal_usdt numeric(36,18) NOT NULL,
  threshold_usdt numeric(36,18) NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  approval_request_id uuid UNIQUE REFERENCES public.admin_approval_requests(id) ON DELETE SET NULL,
  reviewed_by_admin_id uuid REFERENCES public.admin_rbac(admin_id) ON DELETE SET NULL,
  review_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mine_high_value_reviews_position_scope_fk FOREIGN KEY (position_id, user_id, mine_id)
    REFERENCES public.mine_positions(id, user_id, mine_id) ON DELETE RESTRICT,
  CONSTRAINT mine_high_value_reviews_status_chk CHECK (status = ANY (ARRAY['PENDING','APPROVED','REJECTED','CANCELLED']::text[])),
  CONSTRAINT mine_high_value_reviews_amount_chk CHECK (requested_principal_usdt > 0 AND threshold_usdt > 0),
  CONSTRAINT mine_high_value_reviews_threshold_chk CHECK (requested_principal_usdt >= threshold_usdt),
  CONSTRAINT mine_high_value_reviews_review_chk CHECK (status = 'PENDING' OR reviewed_at IS NOT NULL)
);

CREATE INDEX mine_high_value_reviews_status_idx
  ON public.mine_high_value_reviews(status, requested_at);

CREATE TRIGGER mine_high_value_reviews_set_updated_at
  BEFORE UPDATE ON public.mine_high_value_reviews
  FOR EACH ROW EXECUTE FUNCTION public.mine_set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. Mining-specific liability read model. No independent stored balance.
-- practice bucket is legacy/non-mining and intentionally excluded here.
-- ---------------------------------------------------------------------------
CREATE VIEW public.mining_wallet_liability
WITH (security_invoker = true)
AS
SELECT
  wb.user_id,
  wb.principal_usdt,
  wb.profit_usdt,
  wb.locked_usdt,
  wb.trial_principal_usdt,
  wb.trial_locked_usdt,
  (COALESCE(wb.principal_usdt, 0) +
   COALESCE(wb.profit_usdt, 0) +
   COALESCE(wb.locked_usdt, 0))::numeric(36,18) AS real_liability_usdt,
  (COALESCE(wb.trial_principal_usdt, 0) +
   COALESCE(wb.trial_locked_usdt, 0))::numeric(36,18) AS trial_liability_usdt,
  (COALESCE(wb.principal_usdt, 0) +
   COALESCE(wb.profit_usdt, 0) +
   COALESCE(wb.locked_usdt, 0) +
   COALESCE(wb.trial_principal_usdt, 0) +
   COALESCE(wb.trial_locked_usdt, 0))::numeric(36,18) AS total_mining_liability_usdt,
  wb.as_of
FROM public.wallet_buckets wb;

-- ---------------------------------------------------------------------------
-- 12. RLS: Nest service role owns access; Data API is deny-by-default.
-- ---------------------------------------------------------------------------
ALTER TABLE public.mines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_rate_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_position_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_settlement_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_trial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mine_high_value_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.mines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_rate_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_position_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_accruals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_settlements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_settlement_accruals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_trial_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mine_high_value_reviews FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.mines FROM anon, authenticated;
REVOKE ALL ON public.mine_rate_versions FROM anon, authenticated;
REVOKE ALL ON public.mine_positions FROM anon, authenticated;
REVOKE ALL ON public.mine_position_events FROM anon, authenticated;
REVOKE ALL ON public.mine_accruals FROM anon, authenticated;
REVOKE ALL ON public.mine_settlements FROM anon, authenticated;
REVOKE ALL ON public.mine_settlement_accruals FROM anon, authenticated;
REVOKE ALL ON public.mine_trial_sessions FROM anon, authenticated;
REVOKE ALL ON public.mine_high_value_reviews FROM anon, authenticated;
REVOKE ALL ON public.mining_wallet_liability FROM anon, authenticated;

GRANT ALL ON public.mines TO postgres, service_role;
GRANT ALL ON public.mine_rate_versions TO postgres, service_role;
GRANT ALL ON public.mine_positions TO postgres, service_role;
GRANT ALL ON public.mine_position_events TO postgres, service_role;
GRANT ALL ON public.mine_accruals TO postgres, service_role;
GRANT ALL ON public.mine_settlements TO postgres, service_role;
GRANT ALL ON public.mine_settlement_accruals TO postgres, service_role;
GRANT ALL ON public.mine_trial_sessions TO postgres, service_role;
GRANT ALL ON public.mine_high_value_reviews TO postgres, service_role;
GRANT SELECT ON public.mining_wallet_liability TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.mine_set_updated_at() TO postgres, service_role;

COMMENT ON TABLE public.mines IS 'PUTDUK mining catalog. Financial balances never live here.';
COMMENT ON TABLE public.mine_positions IS 'Mining operating position aggregate. Reconcile principal_usdt against immutable events and ledger.';
COMMENT ON TABLE public.mine_position_events IS 'Immutable position principal edge events, each tied to exactly one ledger journal.';
COMMENT ON TABLE public.mine_accruals IS 'Immutable deterministic profit accrual segments.';
COMMENT ON TABLE public.mine_settlements IS 'Settlement state; LEDGER_POSTED requires a ledger journal.';
COMMENT ON TABLE public.mine_settlement_accruals IS 'Each accrual can belong to at most one settlement.';
COMMENT ON VIEW public.mining_wallet_liability IS 'Mining liability projection from existing ledger-backed wallet_buckets; no stored balance.';
