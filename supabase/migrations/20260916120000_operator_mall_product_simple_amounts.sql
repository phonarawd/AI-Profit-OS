-- Additive mall amount columns for admin GET round-trip.
-- 기존 카탈로그 행 DELETE 금지. FX 환산 컬럼 없음.

ALTER TABLE public.operator_mall_products
  ADD COLUMN IF NOT EXISTS required_capital_usdt numeric(36, 18);
ALTER TABLE public.operator_mall_products
  ADD COLUMN IF NOT EXISTS expected_profit_krw_approx numeric(18, 2);

ALTER TABLE public.operator_mall_products
  DROP CONSTRAINT IF EXISTS operator_mall_products_required_capital_usdt_check;
ALTER TABLE public.operator_mall_products
  ADD CONSTRAINT operator_mall_products_required_capital_usdt_check
  CHECK (required_capital_usdt IS NULL OR required_capital_usdt > 0);

COMMENT ON COLUMN public.operator_mall_products.required_capital_usdt IS
  '운영자 입력 필요자본 USDT. 0 저장 금지. FX 환산 없음.';
COMMENT ON COLUMN public.operator_mall_products.expected_profit_krw_approx IS
  '운영자 입력 표시 원화. 생략 시 NULL. FX 환산 없음.';
