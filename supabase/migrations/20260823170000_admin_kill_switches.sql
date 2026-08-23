-- REL-406 Kill Switch 9종
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- 기존 money_circuit / push_control / growth_control / referral_program_config 를
-- 두 번째 회로로 대체하지 않는다. 이 테이블은 9종 상태 + GLOBAL_* SoT.

CREATE TABLE IF NOT EXISTS public.admin_kill_switches (
  id text PRIMARY KEY
    CHECK (id IN (
      'GLOBAL_OPPORTUNITY_PAUSE',
      'GLOBAL_MATCHING_PAUSE',
      'GLOBAL_WITHDRAW_PAUSE',
      'GLOBAL_DEPOSIT_PAUSE',
      'GLOBAL_ALL_PAUSE',
      'MONEY_CIRCUIT',
      'PUSH_KILL',
      'GROWTH_PAUSE',
      'REFERRAL_ACCRUAL_HALT'
    )),
  engaged boolean NOT NULL DEFAULT false,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_kill_switches (id, engaged)
VALUES
  ('GLOBAL_OPPORTUNITY_PAUSE', false),
  ('GLOBAL_MATCHING_PAUSE', false),
  ('GLOBAL_WITHDRAW_PAUSE', false),
  ('GLOBAL_DEPOSIT_PAUSE', false),
  ('GLOBAL_ALL_PAUSE', false),
  ('MONEY_CIRCUIT', false),
  ('PUSH_KILL', false),
  ('GROWTH_PAUSE', false),
  ('REFERRAL_ACCRUAL_HALT', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.admin_kill_switches IS
  'REL-406 9 kill-switch rows · engaged=true blocks server path · wraps money_circuit/push/referral';

CREATE OR REPLACE FUNCTION public.admin_kill_switches_forbid_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_kill_switches delete forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_kill_switches_forbid_delete ON public.admin_kill_switches;
CREATE TRIGGER admin_kill_switches_forbid_delete
  BEFORE DELETE ON public.admin_kill_switches
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_kill_switches_forbid_delete();

ALTER TABLE public.admin_kill_switches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_kill_switches FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_kill_switches TO service_role;
GRANT ALL ON TABLE public.admin_kill_switches TO postgres;

REVOKE ALL ON FUNCTION public.admin_kill_switches_forbid_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kill_switches_forbid_delete() TO postgres, service_role;
