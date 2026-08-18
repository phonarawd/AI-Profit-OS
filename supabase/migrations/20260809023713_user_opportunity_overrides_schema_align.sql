-- Engine §0.0.5.1 / Admin §9.8.9 — align user_opportunity_overrides ↔ schemas/user-opportunity-override.v1
-- Replace legacy pinned / margin_override_usdt with force_show · pin_order · margin_pct_override · expected_profit_usdt_override

-- --- schema columns (1:1 with user-opportunity-override.v1) ---
ALTER TABLE public.user_opportunity_overrides
  ADD COLUMN IF NOT EXISTS force_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_order integer,
  ADD COLUMN IF NOT EXISTS margin_pct_override numeric(36, 18),
  ADD COLUMN IF NOT EXISTS expected_profit_usdt_override numeric(36, 18),
  ADD COLUMN IF NOT EXISTS capital_band_force text;

-- Best-effort backfill: pinned=true → pin_order=0 (display order SSOT = pin_order)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_opportunity_overrides'
      AND column_name = 'pinned'
  ) THEN
    EXECUTE $sql$
      UPDATE public.user_opportunity_overrides
         SET pin_order = 0
       WHERE pinned IS TRUE
         AND pin_order IS NULL
    $sql$;
  END IF;
END $$;

-- Drop legacy columns (≠ schema)
ALTER TABLE public.user_opportunity_overrides
  DROP COLUMN IF EXISTS pinned,
  DROP COLUMN IF EXISTS margin_override_usdt;

-- Mutual exclusion: hidden ⊕ forceShow
ALTER TABLE public.user_opportunity_overrides
  DROP CONSTRAINT IF EXISTS user_opportunity_overrides_hidden_force_xor_chk;

ALTER TABLE public.user_opportunity_overrides
  ADD CONSTRAINT user_opportunity_overrides_hidden_force_xor_chk
  CHECK (NOT (hidden IS TRUE AND force_show IS TRUE));

ALTER TABLE public.user_opportunity_overrides
  DROP CONSTRAINT IF EXISTS user_opportunity_overrides_pin_order_chk;

ALTER TABLE public.user_opportunity_overrides
  ADD CONSTRAINT user_opportunity_overrides_pin_order_chk
  CHECK (pin_order IS NULL OR pin_order >= 0);

ALTER TABLE public.user_opportunity_overrides
  DROP CONSTRAINT IF EXISTS user_opportunity_overrides_capital_band_force_chk;

ALTER TABLE public.user_opportunity_overrides
  ADD CONSTRAINT user_opportunity_overrides_capital_band_force_chk
  CHECK (
    capital_band_force IS NULL
    OR capital_band_force IN ('micro', 'small', 'mid', 'high', 'whale')
  );

-- pinOrder unique per user when set
DROP INDEX IF EXISTS user_opportunity_overrides_user_pin_uq;
CREATE UNIQUE INDEX user_opportunity_overrides_user_pin_uq
  ON public.user_opportunity_overrides (user_id, pin_order)
  WHERE pin_order IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_opportunity_overrides_user_id_idx
  ON public.user_opportunity_overrides (user_id);

COMMENT ON COLUMN public.user_opportunity_overrides.force_show IS
  'Admin §9.8.9 forceShow · mutually exclusive with hidden · NEVER forge compareReady false→true';
COMMENT ON COLUMN public.user_opportunity_overrides.pin_order IS
  'Admin §9.8.9 pinOrder · smaller = higher · Day-1 max 10 pins/user';
COMMENT ON COLUMN public.user_opportunity_overrides.margin_pct_override IS
  'Admin §9.8.9 marginPctOverride · user-session recalc only · NOT ledger';
COMMENT ON COLUMN public.user_opportunity_overrides.expected_profit_usdt_override IS
  'Admin §9.8.9 expectedProfitUsdtOverride · display/participate guard · NOT ledger credit';
COMMENT ON COLUMN public.user_opportunity_overrides.capital_band_force IS
  'Admin §9.8.9 capitalBandForce · filter tone only · requiredCapital unchanged';

-- Day-1 pin cap = 10 / user
CREATE OR REPLACE FUNCTION public.user_opportunity_overrides_pin_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pin_count integer;
BEGIN
  IF NEW.pin_order IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT count(*)::integer INTO pin_count
    FROM public.user_opportunity_overrides
   WHERE user_id = NEW.user_id
     AND pin_order IS NOT NULL
     AND id IS DISTINCT FROM NEW.id;
  IF pin_count >= 10 THEN
    RAISE EXCEPTION 'DAY1_MAX_PINS'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_opportunity_overrides_pin_cap_trg
  ON public.user_opportunity_overrides;

CREATE TRIGGER user_opportunity_overrides_pin_cap_trg
  BEFORE INSERT OR UPDATE OF pin_order
  ON public.user_opportunity_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.user_opportunity_overrides_pin_cap();

-- Audit (before/after JSON · reason≥10 · ledger 불변)
CREATE TABLE IF NOT EXISTS public.user_opportunity_override_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'admin.user.opportunity_override.upsert',
    'admin.user.opportunity_override.delete'
  )),
  before_payload jsonb,
  after_payload jsonb,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  updated_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_opportunity_override_audit_user_idx
  ON public.user_opportunity_override_audit (user_id, created_at DESC);

COMMENT ON TABLE public.user_opportunity_override_audit IS
  'Admin §9.8.9 override audit · before/after JSON · NEVER mutates ledger';

ALTER TABLE public.user_opportunity_override_audit ENABLE ROW LEVEL SECURITY;

GRANT EXECUTE ON FUNCTION public.user_opportunity_overrides_pin_cap() TO postgres, service_role;
