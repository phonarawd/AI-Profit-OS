-- Money §43.2 chain-sweeper · Energy+TRX guard · Admin deposit-settings pause
-- User ledger credit 불변 · status ledger_credited → swept only

ALTER TABLE public.usdt_deposit_events
  ADD COLUMN IF NOT EXISTS swept_at timestamptz;

ALTER TABLE public.usdt_deposit_events
  ADD COLUMN IF NOT EXISTS sweep_tx_hash text;

COMMENT ON COLUMN public.usdt_deposit_events.swept_at IS
  'Money §43.2 · Energy delegate + Treasury sweep completed · user balance unchanged';

COMMENT ON COLUMN public.usdt_deposit_events.sweep_tx_hash IS
  'Money §43.2 · on-chain sweep tx (or dry: ref in Phase0)';

CREATE INDEX IF NOT EXISTS usdt_deposit_events_sweep_queue_idx
  ON public.usdt_deposit_events (credited_at ASC)
  WHERE status = 'ledger_credited';

-- Backfill Day-1 sweeper keys inside deposit-config singleton (idempotent)
UPDATE public.deposit_config
SET
  usdt_onchain = usdt_onchain
    || jsonb_build_object(
      'minTrxStakeForSweeper',
      COALESCE(usdt_onchain->>'minTrxStakeForSweeper', '5000')
    )
    || CASE
      WHEN usdt_onchain ? 'sweeperPaused' THEN '{}'::jsonb
      ELSE '{"sweeperPaused":false}'::jsonb
    END
    || CASE
      WHEN usdt_onchain ? 'energyDelegateEnabled' THEN '{}'::jsonb
      ELSE '{"energyDelegateEnabled":true}'::jsonb
    END
WHERE id = 1;
