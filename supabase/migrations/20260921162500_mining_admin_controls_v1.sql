-- PUTDUK PHASE 05 — mining admin controls v1
-- Additive operational control extension. No balance or ledger authority changes.

ALTER TABLE public.admin_kill_switches
  DROP CONSTRAINT IF EXISTS admin_kill_switches_id_check;

ALTER TABLE public.admin_kill_switches
  ADD CONSTRAINT admin_kill_switches_id_check
  CHECK (id = ANY (ARRAY[
    'GLOBAL_OPPORTUNITY_PAUSE'::text,
    'GLOBAL_MATCHING_PAUSE'::text,
    'GLOBAL_WITHDRAW_PAUSE'::text,
    'GLOBAL_DEPOSIT_PAUSE'::text,
    'GLOBAL_ALL_PAUSE'::text,
    'MONEY_CIRCUIT'::text,
    'PUSH_KILL'::text,
    'GROWTH_PAUSE'::text,
    'REFERRAL_ACCRUAL_HALT'::text,
    'MINING_NEW_POSITIONS_PAUSE'::text,
    'MINING_SETTLEMENT_PAUSE'::text
  ]));

INSERT INTO public.admin_kill_switches (
  id, engaged, reason, updated_by_admin_id
) VALUES
  ('MINING_NEW_POSITIONS_PAUSE', false, NULL, NULL),
  ('MINING_SETTLEMENT_PAUSE', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.admin_kill_switches IS
  'Server-enforced operational kill switches, including PUTDUK mining new-position and settlement holds.';
