-- Money §11.1 fee + §11.2 minHolding · deposit-config keys · audit
-- Keys SSOT: schemas/deposit-config.v1.json · Admin /admin/wallet?tab=deposit-settings

ALTER TABLE public.deposit_config
  ADD COLUMN IF NOT EXISTS withdraw_guards jsonb NOT NULL DEFAULT '{"minHoldingHours":24}'::jsonb;

ALTER TABLE public.deposit_config
  ALTER COLUMN withdraw_guards DROP DEFAULT;

COMMENT ON COLUMN public.deposit_config.withdraw_guards IS
  'Money §11.2 · minHoldingHours Day-1=24 · principal|combined only · profit-only 미적용 · 구호칭 compliance.minHoldingHours 승계(이중테이블0)';

ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS withdraw_fee_usdt numeric(36, 18) NOT NULL DEFAULT 0
    CHECK (withdraw_fee_usdt >= 0);

COMMENT ON COLUMN public.withdraw_intents.withdraw_fee_usdt IS
  'Money §11.1 · USDT network fee quoted from deposit-config.usdtOnchain.usdtWithdrawNetworkFeeUsdt · 0 when asset=KRW uses krwWithdrawFeeKrw separately';

CREATE TABLE IF NOT EXISTS public.deposit_config_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_version integer NOT NULL CHECK (config_version >= 1),
  previous_payload jsonb,
  next_payload jsonb NOT NULL,
  changed_by_admin_id uuid NOT NULL,
  change_reason text NOT NULL CHECK (char_length(change_reason) >= 4),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_config_audit_created_at_idx
  ON public.deposit_config_audit (created_at DESC);

COMMENT ON TABLE public.deposit_config_audit IS
  'Admin deposit-settings PATCH audit · fee/minHolding/TRX/sweeper · Money Owns';

ALTER TABLE public.deposit_config_audit ENABLE ROW LEVEL SECURITY;

-- Backfill fee keys inside existing jsonb blobs (idempotent)
UPDATE public.deposit_config
SET
  krw = CASE
    WHEN krw ? 'krwWithdrawFeeKrw' THEN krw
    ELSE krw || '{"krwWithdrawFeeKrw":0}'::jsonb
  END,
  usdt_onchain = CASE
    WHEN usdt_onchain ? 'usdtWithdrawNetworkFeeUsdt' THEN usdt_onchain
    ELSE usdt_onchain || '{"usdtWithdrawNetworkFeeUsdt":"1"}'::jsonb
  END
WHERE id = 1;
