-- In-app match profit source. Real USDT/KRW leaves only at withdraw broadcast.
-- SYS:MATCH_PROFIT_EXPENSE = debit-normal ops_pool (virtual expense).
-- Nest falls back to SYS:OPS_POOL if this row is missing.

INSERT INTO public.ledger_accounts (code, owner_type, account_kind, bucket, balance_usdt)
VALUES
  ('SYS:MATCH_PROFIT_EXPENSE', 'system', 'ops_pool', NULL, 0)
ON CONFLICT (code) DO NOTHING;
