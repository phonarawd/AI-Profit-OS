-- Reconciled from production migration history 2026-09-02.
-- Additive and idempotent; preserves existing withdrawal intent rows.
ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS broadcast_tx_hash text,
  ADD COLUMN IF NOT EXISTS broadcast_status text,
  ADD COLUMN IF NOT EXISTS broadcast_idempotency_key text;
