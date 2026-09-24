-- PHASE 02 read-only verification. Expected: every boolean true, every mismatch/count target satisfied.

WITH mining_tables AS (
  SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname IN (
      'mines','mine_rate_versions','mine_positions','mine_position_events',
      'mine_accruals','mine_settlements','mine_settlement_accruals',
      'mine_trial_sessions','mine_high_value_reviews'
    )
), money_cols AS (
  SELECT table_name, column_name, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name LIKE 'mine%'
    AND column_name LIKE '%usdt%'
)
SELECT jsonb_build_object(
  'table_count', (SELECT count(*) FROM mining_tables),
  'all_rls_enabled', (SELECT bool_and(relrowsecurity) FROM mining_tables),
  'all_rls_forced', (SELECT bool_and(relforcerowsecurity) FROM mining_tables),
  'money_columns_all_36_18', (SELECT bool_and(numeric_precision = 36 AND numeric_scale = 18) FROM money_cols),
  'money_column_count', (SELECT count(*) FROM money_cols),
  'mining_pool_accounts', (SELECT count(*) FROM public.ledger_accounts WHERE code = 'SYS:MINING_POOL' AND account_kind = 'mining_pool' AND currency = 'USDT'),
  'direct_balance_columns', (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'mine%' AND column_name ILIKE '%balance%'),
  'liability_view_exists', (SELECT count(*) FROM pg_views WHERE schemaname = 'public' AND viewname = 'mining_wallet_liability') = 1,
  'liability_projection_mismatches', (SELECT count(*) FROM public.mining_wallet_liability WHERE total_mining_liability_usdt <> real_liability_usdt + trial_liability_usdt),
  'open_position_unique_index', EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'mine_positions_one_open_per_user_mine_idx'),
  'single_active_rate_index', EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'mine_rate_versions_one_active_idx'),
  'ledger_kind_has_mining_pool', EXISTS(
    SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
    WHERE c.relname = 'ledger_accounts' AND con.conname = 'ledger_accounts_account_kind_check'
      AND pg_get_constraintdef(con.oid, true) ILIKE '%mining_pool%'
  ),
  'ledger_journal_has_mining_types', EXISTS(
    SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
    WHERE c.relname = 'ledger_journals' AND con.conname = 'ledger_journals_journal_type_check'
      AND pg_get_constraintdef(con.oid, true) ILIKE '%mine_position_lock%'
      AND pg_get_constraintdef(con.oid, true) ILIKE '%mine_profit_settlement%'
  )
) AS checks;

SELECT r AS relation,
       has_table_privilege('anon', 'public.' || r, 'SELECT') AS anon_select,
       has_table_privilege('authenticated', 'public.' || r, 'SELECT') AS authenticated_select,
       has_table_privilege('service_role', 'public.' || r, 'SELECT') AS service_select,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = r) AS policy_count
FROM unnest(ARRAY[
  'mines','mine_rate_versions','mine_positions','mine_position_events',
  'mine_accruals','mine_settlements','mine_settlement_accruals',
  'mine_trial_sessions','mine_high_value_reviews'
]) AS r;
