-- PTF-00C-R1 §2 — durable provider-tick idempotency ledger.
-- Root cause: the ebay-adapter worker splits listings into batches (and
-- Nest ingest can be retried/duplicated), but the SAME marketplaceHealth
-- evidence for one real scheduled tick was applied to
-- public.provider_runtime_health's cumulative counters on EVERY delivery —
-- one real provider tick could be durably counted more than once.
--
-- This table is the uniqueness authority. ProviderHealthService.recordTick()
-- claims a row here (INSERT ... ON CONFLICT (provider_id, marketplace_id,
-- provider_tick_id) DO NOTHING) BEFORE it is allowed to touch
-- provider_runtime_health's cumulative attempted/success/failure counters
-- or run the circuit-state transition. A conflict = this exact tick's
-- evidence for this exact marketplace was already durably recorded — the
-- call becomes a pure no-op, regardless of listing-batch count, ingest
-- retry, duplicate request, or arrival order.

CREATE TABLE IF NOT EXISTS public.provider_tick_ledger (
  provider_id text NOT NULL,
  -- '' = provider-level aggregate row, same sentinel as provider_runtime_health.
  marketplace_id text NOT NULL DEFAULT '',
  provider_tick_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, marketplace_id, provider_tick_id)
);

COMMENT ON TABLE public.provider_tick_ledger IS
  'PTF-00C-R1 durable idempotency claim: one real scheduled provider tick claims exactly one row per (provider_id, marketplace_id, provider_tick_id). Duplicate ingest delivery / listing-batch replay / out-of-order arrival conflicts here and becomes a no-op against provider_runtime_health cumulative counters — see ProviderHealthService.recordTick().';

CREATE INDEX IF NOT EXISTS provider_tick_ledger_provider_idx
  ON public.provider_tick_ledger (provider_id, recorded_at DESC);

ALTER TABLE public.provider_tick_ledger ENABLE ROW LEVEL SECURITY;
