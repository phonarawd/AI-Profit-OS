-- In-app match profit source. Real USDT/KRW leaves only at withdraw broadcast.
-- SYS:MATCH_PROFIT_EXPENSE = debit-normal virtual expense.
-- Nest fail-closed if this row is missing. SYS:OPS_POOL fallback 0.

INSERT INTO public.ledger_accounts (code, owner_type, account_kind, bucket, balance_usdt)
VALUES
  ('SYS:MATCH_PROFIT_EXPENSE', 'system', 'ops_pool', NULL, 0)
ON CONFLICT (code) DO NOTHING;

-- A5: durable executed/settled events. compareReady/timer is not payment.
CREATE TABLE IF NOT EXISTS public.trade_execution_confirmations (
  event_id text PRIMARY KEY,
  trade_id uuid NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS trade_execution_confirmations_trade_idx
  ON public.trade_execution_confirmations (trade_id);

CREATE UNIQUE INDEX IF NOT EXISTS trade_execution_confirmations_open_trade
  ON public.trade_execution_confirmations (trade_id)
  WHERE consumed_at IS NULL;
