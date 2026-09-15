-- Additive supply_source. 기존 행 DELETE 0 · operator 일괄 UPDATE 0.
-- DEFAULT legacy_external 이므로 기존 행은 legacy 로 남고 유저면에서 숨긴다.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS supply_source text NOT NULL DEFAULT 'legacy_external';

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_supply_source_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_supply_source_check
  CHECK (supply_source IN ('operator', 'legacy_external'));

COMMENT ON COLUMN public.opportunities.supply_source IS
  'operator=운영자 등록(외부 writer 차단). legacy_external=기존 eBay/시드 경로. 자동 승격 금지.';

CREATE INDEX IF NOT EXISTS opportunities_supply_source_idx
  ON public.opportunities (supply_source);
