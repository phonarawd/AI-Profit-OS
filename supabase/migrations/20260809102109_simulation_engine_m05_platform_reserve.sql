-- Engine §51.4 M0.5 simulation-engine + §0.0.4.3 platform_reserve
-- Growth ON requires latest simulation PASS ≤24h + reserve configured
-- FORBIDDEN: unset reserve → Growth ON · S2 pass without reserve

-- Ledger account for Ops reserve (USDT) · plan code ops.platform_reserve_usdt
INSERT INTO public.ledger_accounts (code, owner_type, account_kind, bucket, balance_usdt)
VALUES ('ops.platform_reserve_usdt', 'system', 'ops_pool', NULL, 0)
ON CONFLICT (code) DO NOTHING;

COMMENT ON COLUMN public.ledger_accounts.code IS
  'System codes SYS:* · ops.platform_reserve_usdt = Engine §0.0.4.3 S2 input';

-- Singleton target config (Ops/재무 · product P0 Freeze 아님)
CREATE TABLE IF NOT EXISTS public.platform_reserve_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  target_usdt numeric(36, 18) NOT NULL DEFAULT 0,
  is_set boolean NOT NULL DEFAULT false,
  updated_by_admin_id uuid,
  change_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_reserve_config (id, target_usdt, is_set)
VALUES (1, 0, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.platform_reserve_config IS
  'Engine §0.0.4.3 · Admin /admin/system-control?tab=reserve · unset → Growth ON 0 · S2 Fail';

CREATE TABLE IF NOT EXISTS public.platform_reserve_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL DEFAULT 'admin.platform_reserve.updated'
    CHECK (action = 'admin.platform_reserve.updated'),
  previous_payload jsonb NOT NULL,
  next_payload jsonb NOT NULL,
  changed_by_admin_id uuid NOT NULL,
  change_reason text NOT NULL CHECK (char_length(change_reason) >= 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_reserve_audit_created_at_idx
  ON public.platform_reserve_audit (created_at DESC);

COMMENT ON TABLE public.platform_reserve_audit IS
  'Admin platform_reserve target before/after · Engine §0.0.4.3';

-- M0.5 simulation run history
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  as_of timestamptz NOT NULL,
  horizon_hours integer NOT NULL DEFAULT 24 CHECK (horizon_hours = 24),
  report jsonb NOT NULL,
  gates jsonb NOT NULL,
  overall_pass boolean NOT NULL,
  platform_reserve_usdt numeric(36, 18),
  platform_reserve_is_set boolean NOT NULL DEFAULT false,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_runs_as_of_idx
  ON public.simulation_runs (as_of DESC);

CREATE INDEX IF NOT EXISTS simulation_runs_overall_pass_idx
  ON public.simulation_runs (overall_pass, as_of DESC);

COMMENT ON TABLE public.simulation_runs IS
  'Engine §51.4 M0.5 SimulationReport + S1~S4 gates · Growth ON gate source';

-- Growth feature flag (admin.growth.enabled)
CREATE TABLE IF NOT EXISTS public.growth_control (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_by_admin_id uuid,
  change_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.growth_control (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.growth_control IS
  'admin.growth.enabled · requires latest simulation PASS ≤24h + platform_reserve is_set';

CREATE TABLE IF NOT EXISTS public.growth_control_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL DEFAULT 'admin.growth.enabled'
    CHECK (action = 'admin.growth.enabled'),
  previous_enabled boolean NOT NULL,
  next_enabled boolean NOT NULL,
  gate_snapshot jsonb NOT NULL,
  changed_by_admin_id uuid NOT NULL,
  change_reason text NOT NULL CHECK (char_length(change_reason) >= 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_control_audit_created_at_idx
  ON public.growth_control_audit (created_at DESC);

ALTER TABLE public.platform_reserve_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_reserve_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_control_audit ENABLE ROW LEVEL SECURITY;
