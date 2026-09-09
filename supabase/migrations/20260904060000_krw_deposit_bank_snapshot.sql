-- Additive immutable bank-account snapshot on krw_deposit_requests.
-- Existing rows stay nullable. No backfill. No UPDATE of deposit_config.
--
-- Problem this fixes: GET /wallet/krw-deposit-instructions currently
-- projects the CURRENT admin deposit_config singleton, with no link to any
-- specific krw_deposit_requests row. If the admin rotates the active bank
-- account while a request is pending, every user (including one already
-- mid-transfer on the old account) silently sees the new account on next
-- load, with no warning and no record of which account they were actually
-- shown. These columns let a request carry its own immutable snapshot
-- instead, taken once at creation time from the admin config in force at
-- that moment.

ALTER TABLE public.krw_deposit_requests
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_holder text;

COMMENT ON COLUMN public.krw_deposit_requests.bank_name IS
  'Immutable snapshot of the active deposit_config bank name at request creation time. Not re-read from admin config afterward.';

COMMENT ON COLUMN public.krw_deposit_requests.account_number IS
  'Immutable snapshot of the active deposit_config account number at request creation time. Not re-read from admin config afterward.';

COMMENT ON COLUMN public.krw_deposit_requests.account_holder IS
  'Immutable snapshot of the active deposit_config account holder name at request creation time. Not re-read from admin config afterward.';
