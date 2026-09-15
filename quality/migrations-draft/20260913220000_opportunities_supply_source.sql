-- DRAFT ONLY. 운영 DB에 적용하지 말 것. REL-701-DB 등 별도 승인 전 apply/repair 금지.
-- 식별 컬럼만. 기존 행 DELETE 0 · supply_source='operator' 일괄 UPDATE 0.
-- DEFAULT legacy_external 이므로 기존 행은 자동으로 legacy 로 남는다.
--
-- 이 파일은 supabase/migrations 밖에 둔다. 승인 전에 그 폴더에 넣으면
-- migrations-applied-parity / REL-701 committedUnapplied=0 검사와 충돌한다.
-- 운영 반영 승인 후: 이 내용을 supabase/migrations 로 옮기고 fixture 를 갱신한 뒤 적용.
--
-- 배포 순서 (승인 후):
--   1) 이 파일을 원격 schema_migrations 에 적용
--   2) CatalogExternalWriteGuard 가 있는 Nest 배포
-- 코드가 컬럼보다 먼저 올라가면 상품 외부 쓰기는 SCHEMA_UNREADY 로 전부 차단된다.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS supply_source text NOT NULL DEFAULT 'legacy_external';

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_supply_source_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_supply_source_check
  CHECK (supply_source IN ('operator', 'legacy_external'));

COMMENT ON COLUMN public.opportunities.supply_source IS
  'S1 식별. operator=운영자 등록(외부 writer 차단). legacy_external=기존 eBay/시드 경로. 자동 승격 금지.';
