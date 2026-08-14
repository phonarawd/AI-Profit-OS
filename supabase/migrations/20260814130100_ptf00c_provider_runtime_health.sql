-- PTF-00C P0-C/P0-D/§9/§10 — durable provider/marketplace health.
-- Root cause: AdaptersAdminService tracked adapter health only in an
-- in-process Map (services/api-nest/src/adapters/adapters.admin.service.ts) —
-- restart/redeploy silently erases circuit/failure evidence. This table is
-- the durable evidence store; services/market-intelligence/src/provider-health.cjs
-- computes the CLOSED/OPEN circuit transitions + HEALTHY/DEGRADED/STALE/BLOCKED
-- status from it (pure functions), Nest only persists.

CREATE TABLE IF NOT EXISTS public.provider_runtime_health (
  provider_id text NOT NULL,
  -- '' = provider-level aggregate row (no single marketplace).
  marketplace_id text NOT NULL DEFAULT '',
  circuit_state text NOT NULL DEFAULT 'CLOSED'
    CHECK (circuit_state IN ('CLOSED', 'OPEN')),
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  opened_at timestamptz,
  attempted_count integer NOT NULL DEFAULT 0 CHECK (attempted_count >= 0),
  success_count integer NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error_class text,
  last_tick_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, marketplace_id)
);

COMMENT ON TABLE public.provider_runtime_health IS
  'PTF-00C durable heartbeat/circuit evidence. eBay down != Peotteok down: BLOCKED here must only gate new auto-publish, never mutate settled money.';
COMMENT ON COLUMN public.provider_runtime_health.circuit_state IS
  'Persisted transition state only (CLOSED/OPEN). HALF_OPEN is a read-time derived label — see provider-health.cjs deriveDisplayCircuitState.';

CREATE INDEX IF NOT EXISTS provider_runtime_health_provider_idx
  ON public.provider_runtime_health (provider_id);

ALTER TABLE public.provider_runtime_health ENABLE ROW LEVEL SECURITY;
