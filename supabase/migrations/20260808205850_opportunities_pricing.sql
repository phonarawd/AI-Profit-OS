-- Opportunities / pricing / execution · Engine §0.0 · §36 · §48
-- yahoo_jp FORBIDDEN in market ids

CREATE TABLE public.assets (
  asset_id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('watch', 'trading_card', 'luxury_bag')),
  asset_label text NOT NULL,
  image_url text NOT NULL,
  image_source text NOT NULL CHECK (image_source IN ('ebay', 'pokemontcg', 'ygoprodeck', 'admin_r2')),
  image_alt_ko text NOT NULL,
  image_rights_note_ko text NOT NULL DEFAULT '시세 참고용'
    CHECK (image_rights_note_ko = '시세 참고용'),
  image_fetched_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fx_snapshots (
  id text PRIMARY KEY,
  usd_krw numeric(18, 6) NOT NULL CHECK (usd_krw > 0),
  source text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.execution_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  match_strictness text NOT NULL
    CHECK (match_strictness IN ('lenient', 'standard', 'tight', 'scarce', 'custom')),
  min_profit_usdt numeric(36, 18) NOT NULL CHECK (min_profit_usdt >= 0),
  stale_allowance_sec integer NOT NULL CHECK (stale_allowance_sec >= 0),
  max_rematch_count integer NOT NULL CHECK (max_rematch_count >= 0),
  retry_wait_sec integer NOT NULL CHECK (retry_wait_sec >= 0),
  slippage_bound_bps integer NOT NULL CHECK (slippage_bound_bps >= 0),
  daily_user_match_cap integer NOT NULL CHECK (daily_user_match_cap >= 0),
  daily_opp_slots_default integer NOT NULL CHECK (daily_opp_slots_default >= 0),
  auto_cancel_on_shortfall boolean NOT NULL DEFAULT true,
  membership_band_overlay_enabled boolean NOT NULL DEFAULT false,
  presentation jsonb NOT NULL,
  updated_by_admin_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX execution_policies_one_active_uq
  ON public.execution_policies ((is_active))
  WHERE is_active;

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets (asset_id),
  pricing_version integer NOT NULL CHECK (pricing_version >= 1),
  priced_at timestamptz NOT NULL,
  expected_profit_usdt numeric(36, 18) NOT NULL,
  expected_profit_krw_approx numeric(18, 2),
  fx_snapshot_id text NOT NULL REFERENCES public.fx_snapshots (id),
  estimated_duration_sec integer NOT NULL CHECK (estimated_duration_sec >= 1),
  ai_confidence_score numeric(6, 2) NOT NULL CHECK (ai_confidence_score BETWEEN 0 AND 100),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'normal', 'premium', 'hot')),
  tags text[] NOT NULL DEFAULT '{}',
  required_capital_usdt numeric(36, 18) NOT NULL CHECK (required_capital_usdt >= 0),
  execution_mode text NOT NULL DEFAULT 'orchestrate' CHECK (execution_mode = 'orchestrate'),
  execution_platforms text[] NOT NULL DEFAULT '{}',
  category text NOT NULL CHECK (category IN ('watch', 'trading_card', 'luxury_bag')),
  asset_label text NOT NULL,
  asset_image_url text NOT NULL,
  asset_image_source text NOT NULL CHECK (asset_image_source IN ('ebay', 'pokemontcg', 'ygoprodeck', 'admin_r2')),
  asset_image_alt_ko text NOT NULL,
  arbitrage_type text NOT NULL CHECK (arbitrage_type IN ('price', 'fx', 'benefit', 'limited', 'resale')),
  arbitrage_type_ko text NOT NULL,
  pricing jsonb NOT NULL,
  stale_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'paused', 'expired', 'circuit_open')),
  sell_success_rate numeric(8, 6),
  sell_success_window_days integer,
  sell_success_as_of timestamptz,
  risk_score smallint CHECK (risk_score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_pricing_no_yahoo_chk CHECK (
    (pricing->>'buyMarketId') IS DISTINCT FROM 'yahoo_jp'
    AND (pricing->>'sellMarketId') IS DISTINCT FROM 'yahoo_jp'
  )
);

CREATE INDEX opportunities_status_stale_idx ON public.opportunities (status, stale_at);
CREATE INDEX opportunities_category_idx ON public.opportunities (category);
CREATE INDEX opportunities_asset_id_idx ON public.opportunities (asset_id);

CREATE TABLE public.user_opportunity_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id) ON DELETE CASCADE,
  hidden boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  margin_override_usdt numeric(36, 18),
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  updated_by_admin_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_opportunity_overrides_uq UNIQUE (user_id, opportunity_id)
);

CREATE TABLE public.user_match_policy_overrides (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  match_strictness text NOT NULL
    CHECK (match_strictness IN ('lenient', 'standard', 'tight', 'scarce', 'custom')),
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  updated_by_admin_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trade_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id),
  pricing_version integer NOT NULL CHECK (pricing_version >= 1),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'requeue', 'success', 'safe_stop', 'cancelled', 'failed')),
  result_code text CHECK (result_code IN (
    'MATCH_SUCCESS',
    'REQUEUE',
    'PRICE_MOVED',
    'BELOW_MIN_PROFIT',
    'CANCELLED_BY_USER',
    'CIRCUIT_OPEN',
    'SYSTEM_FAILED',
    'MATCH_TIMEOUT'
  )),
  step_index smallint NOT NULL DEFAULT 0 CHECK (step_index BETWEEN 0 AND 4),
  progress_pct numeric(5, 2) NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  log_line text,
  expected_profit_usdt numeric(36, 18) NOT NULL,
  settled_profit_usdt numeric(36, 18),
  ledger_journal_id uuid REFERENCES public.ledger_journals (id),
  idempotency_key text NOT NULL UNIQUE,
  asset jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trade_executions_user_id_idx ON public.trade_executions (user_id);
CREATE INDEX trade_executions_opportunity_id_idx ON public.trade_executions (opportunity_id);
CREATE INDEX trade_executions_status_idx ON public.trade_executions (status);

CREATE TABLE public.participate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities (id),
  pricing_version integer NOT NULL,
  min_profit_usdt numeric(36, 18) NOT NULL,
  capital_usdt numeric(36, 18) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  trade_id uuid REFERENCES public.trade_executions (id),
  idempotency_key text NOT NULL UNIQUE,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX participate_requests_user_id_idx ON public.participate_requests (user_id);
