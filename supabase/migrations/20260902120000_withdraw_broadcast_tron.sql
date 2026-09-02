-- TRON withdraw broadcast columns (Production apply needs Founder approval)
ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS broadcast_tx_hash text,
  ADD COLUMN IF NOT EXISTS broadcast_status text,
  ADD COLUMN IF NOT EXISTS broadcast_idempotency_key text;
