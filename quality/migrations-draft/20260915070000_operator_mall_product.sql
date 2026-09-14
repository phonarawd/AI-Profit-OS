-- DRAFT ONLY. 운영 DB에 적용하지 말 것.
-- supabase/migrations 에 넣지 말 것 (committedUnapplied 충돌).
-- 승인된 격리 QA Postgres dry-run만. DATABASE_URL(운영) 대체 금지.

-- 기존 카탈로그 행에 공개 범위·가격 확인 메모를 붙인다.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'all_public';
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_visibility_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_visibility_check
  CHECK (visibility IN ('all_public', 'selected_members', 'private'));

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS selected_member_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS price_confirmation_memo text;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS composition_qty integer;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS product_revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS configured_payout_usdt numeric(36, 18);

COMMENT ON COLUMN public.opportunities.visibility IS
  '쇼핑몰형 공개 범위. 권한이지 독점 예약이 아님.';
COMMENT ON COLUMN public.opportunities.selected_member_ids IS
  'visibility=selected_members 일 때만 의미. 지정 회원 동시 참여 가능.';
COMMENT ON COLUMN public.opportunities.price_confirmation_memo IS
  '가격 확인 메모. Admin patchPricing reason 과 별도.';
COMMENT ON COLUMN public.opportunities.configured_payout_usdt IS
  '참여 snapshot 설정 지급액. expected_profit_usdt 와 다름.';

-- 운영자 등록 상품 전용 행. 외부 카탈로그 asset/FX FK 를 만들지 않는다.
CREATE TABLE IF NOT EXISTS public.operator_mall_products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  composition_qty integer NOT NULL CHECK (composition_qty >= 1),
  configured_payout_usdt numeric(36, 18) NOT NULL CHECK (configured_payout_usdt > 0),
  currency text NOT NULL DEFAULT 'USDT' CHECK (currency = 'USDT'),
  visibility text NOT NULL DEFAULT 'all_public'
    CHECK (visibility IN ('all_public', 'selected_members', 'private')),
  selected_member_ids uuid[] NOT NULL DEFAULT '{}',
  price_confirmation_memo text,
  product_revision integer NOT NULL DEFAULT 1 CHECK (product_revision >= 1),
  supply_source text NOT NULL DEFAULT 'operator' CHECK (supply_source = 'operator'),
  opportunity_id uuid,
  register_idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_mall_products_register_idem_uq
  ON public.operator_mall_products (register_idempotency_key)
  WHERE register_idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.operator_mall_participations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.operator_mall_products (id),
  idempotency_key text NOT NULL,
  status text NOT NULL,
  payout_status text NOT NULL
    CHECK (payout_status IN ('pending', 'paid', 'failed', 'blocked')),
  snapshot jsonb NOT NULL,
  journal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_mall_participations_user_idem_uq UNIQUE (user_id, idempotency_key)
);

-- 실 원장 전표는 기존 ledger_journals.idempotency_key UNIQUE 재사용.
-- 이 표는 posting 어댑터 없을 때의 연결 의도만. 잔액 UPDATE 금지.
CREATE TABLE IF NOT EXISTS public.operator_mall_settlement_journals (
  id uuid PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  journal_type text NOT NULL DEFAULT 'settlement',
  reference_type text NOT NULL DEFAULT 'participation',
  reference_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  bucket text NOT NULL DEFAULT 'profit',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS operator_mall_settlement_one_payout_uq
  ON public.operator_mall_settlement_journals (reference_id)
  WHERE journal_type = 'settlement' AND reference_type = 'participation';

CREATE INDEX IF NOT EXISTS operator_mall_participations_product_idx
  ON public.operator_mall_participations (product_id);
CREATE INDEX IF NOT EXISTS operator_mall_participations_user_idx
  ON public.operator_mall_participations (user_id);

-- opportunities.supply_source 는 별도 draft
-- quality/migrations-draft/20260913220000_opportunities_supply_source.sql
-- 참여 loadMallAccess 는 visibility + supply_source 가 같이 있어야 42703 을 피한다.
-- 이 파일은 supply_source 를 중복 ADD 하지 않는다.
-- 실 원장 권위는 public.ledger_journals. 이 settlement 표는 posting 없을 때의 연결 의도만.
