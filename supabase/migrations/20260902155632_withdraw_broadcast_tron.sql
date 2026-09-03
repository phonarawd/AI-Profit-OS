-- withdraw_broadcast_tron (remote-applied source restore)
-- remote version 20260902155632 already applied on mgsytcetsiecllmhcyox
-- SQL matches remote schema_migrations.statements; Production re-apply NOT required
ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS broadcast_tx_hash text,
  ADD COLUMN IF NOT EXISTS broadcast_status text,
  ADD COLUMN IF NOT EXISTS broadcast_idempotency_key text;
