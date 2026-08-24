-- Additive KRW deposit request-time quote + final applied FX facts.
-- Existing rows stay nullable. No backfill. No ledger rewrite. No fx_snapshots UPDATE.

ALTER TABLE public.krw_deposit_requests
  ADD COLUMN IF NOT EXISTS quote_fx_snapshot_id text
    REFERENCES public.fx_snapshots (id),
  ADD COLUMN IF NOT EXISTS quote_usdt_krw numeric(18, 6)
    CHECK (quote_usdt_krw IS NULL OR quote_usdt_krw > 0),
  ADD COLUMN IF NOT EXISTS quote_formula_id text,
  ADD COLUMN IF NOT EXISTS quote_fx_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_usdt numeric(36, 18)
    CHECK (estimated_usdt IS NULL OR estimated_usdt > 0),
  ADD COLUMN IF NOT EXISTS applied_fx_snapshot_id text
    REFERENCES public.fx_snapshots (id),
  ADD COLUMN IF NOT EXISTS applied_usdt_krw numeric(18, 6)
    CHECK (applied_usdt_krw IS NULL OR applied_usdt_krw > 0),
  ADD COLUMN IF NOT EXISTS applied_formula_id text,
  ADD COLUMN IF NOT EXISTS applied_fx_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS credited_usdt numeric(36, 18)
    CHECK (credited_usdt IS NULL OR credited_usdt > 0);

COMMENT ON COLUMN public.krw_deposit_requests.unique_suffix_krw IS
  'Bank-transfer identification amount. NOT fee, spread, or platform revenue. Conversion base = payable_amount_krw = requested_amount_krw + unique_suffix_krw.';

COMMENT ON COLUMN public.krw_deposit_requests.payable_amount_krw IS
  'Actual payment amount the user must transfer. Quote and final USDT both convert this amount.';

COMMENT ON COLUMN public.krw_deposit_requests.estimated_usdt IS
  'Request-time estimate only. NOT a locked rate. trunc18(payable_amount_krw / quote_usdt_krw).';

COMMENT ON COLUMN public.krw_deposit_requests.credited_usdt IS
  'Approval-time financial fact. Must equal ledger deposit_krw principal credit. NULL when not approved.';

COMMENT ON COLUMN public.krw_deposit_requests.quote_usdt_krw IS
  'Request-time fx_snapshots.usd_krw (KRW per 1 USDT). Estimate only.';

COMMENT ON COLUMN public.krw_deposit_requests.applied_usdt_krw IS
  'Approval-time fx_snapshots.usd_krw (KRW per 1 USDT) actually used for credited_usdt.';
