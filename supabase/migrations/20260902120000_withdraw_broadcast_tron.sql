-- TRON withdraw broadcast columns (Production apply needs Founder approval)
ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS broadcast_tx_hash text,
  ADD COLUMN IF NOT EXISTS broadcast_status text,
  ADD COLUMN IF NOT EXISTS broadcast_idempotency_key text;

COMMENT ON COLUMN public.withdraw_intents.broadcast_tx_hash IS
  'TRON / Tatum tx id or KMS pending id — never a private key';
COMMENT ON COLUMN public.withdraw_intents.broadcast_status IS
  'kms_pending | broadcast | confirmed | failed';
COMMENT ON COLUMN public.withdraw_intents.broadcast_idempotency_key IS
  'Idempotency key for Tatum broadcast queue';

CREATE UNIQUE INDEX IF NOT EXISTS withdraw_intents_broadcast_idem_uidx
  ON public.withdraw_intents (broadcast_idempotency_key)
  WHERE broadcast_idempotency_key IS NOT NULL;
