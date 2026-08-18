-- PTF-00C §8/§9 — track whether the MOST RECENT heartbeat tick had a mix of
-- success and failure (partial failure), distinct from the cumulative
-- attempted/success/failure counters. Needed so a partial-failure tick can
-- correctly render DEGRADED (yellow) even though it did not trip the
-- CLOSED->OPEN circuit (tickSuccess=true resets consecutive_failures).

ALTER TABLE public.provider_runtime_health
  ADD COLUMN IF NOT EXISTS last_tick_had_partial_failure boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.provider_runtime_health.last_tick_had_partial_failure IS
  'true when the most recent tick had successCount>0 AND failureCount>0 (some marketplaces/queries failed while others succeeded) — forces DEGRADED, never HEALTHY, per PTF-00C §8.';
