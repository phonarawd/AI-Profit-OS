-- REL-407 Price Override Engine (4레이어)
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- SOURCE = public.listings (이 테이블에 관측가 쓰지 않음 · listings UPDATE 0)
-- OVERRIDE = 이 테이블 · EFFECTIVE = opportunities.pricing 계산 결과
-- USER_VISIBLE = API projection (EFFECTIVE only)

CREATE TABLE IF NOT EXISTS public.opportunity_price_overrides (
  opportunity_id uuid PRIMARY KEY
    REFERENCES public.opportunities (id) ON DELETE CASCADE,
  engaged boolean NOT NULL DEFAULT false,
  admin_buy_usdt numeric(36, 18),
  admin_sell_usdt numeric(36, 18),
  admin_margin_pct numeric(36, 18),
  reason_code text NOT NULL
    CHECK (reason_code IN (
      'SOURCE_STALE',
      'FEED_GAP',
      'MANUAL_COMMERCIAL',
      'RISK_ADJUST',
      'OVERRIDE_CLEAR'
    )),
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_price_overrides_reason_min
    CHECK (char_length(btrim(reason)) >= 10)
);

COMMENT ON TABLE public.opportunity_price_overrides IS
  'REL-407 OVERRIDE layer SoT · SOURCE stays on listings · not ledger credit';

CREATE OR REPLACE FUNCTION public.opportunity_price_overrides_forbid_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'opportunity_price_overrides delete forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS opportunity_price_overrides_forbid_delete
  ON public.opportunity_price_overrides;
CREATE TRIGGER opportunity_price_overrides_forbid_delete
  BEFORE DELETE ON public.opportunity_price_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.opportunity_price_overrides_forbid_delete();

ALTER TABLE public.opportunity_price_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.opportunity_price_overrides FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.opportunity_price_overrides TO service_role;
GRANT ALL ON TABLE public.opportunity_price_overrides TO postgres;

REVOKE ALL ON FUNCTION public.opportunity_price_overrides_forbid_delete()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.opportunity_price_overrides_forbid_delete()
  TO postgres, service_role;
