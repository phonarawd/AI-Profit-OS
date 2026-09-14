# Draft only — 운영 DDL 실행 금지

대상: 운영자 쇼핑몰형 공용 상품 공개 범위 · 가격 확인 메모 · 참여 snapshot. `supabase/migrations` 에 넣지 않음.

SQL 초안: `quality/migrations-draft/20260915070000_operator_mall_product.sql`

## 의도 (미적용)

`public.opportunities` 추가 컬럼 초안:

- `visibility` text not null default `all_public` check (`all_public` | `selected_members` | `private`)
- `selected_member_ids` uuid[] not null default `{}`
- `price_confirmation_memo` text — 가격 확인 메모. Admin `patchPricing` reason 과 별도
- `composition_qty` integer null — 구성 수량. 판매 가능 재고 아님
- `product_revision` integer not null default 1
- `configured_payout_usdt` numeric — 참여 snapshot 설정액. `expected_profit_usdt` 와 다름

운영자 등록 전용 표 초안: `operator_mall_products` · `operator_mall_participations` · `operator_mall_settlement_journals`

참여 snapshot은 기존 `participate_requests` / `trade_executions` 회원별 행에도 고정. 상품 전체 행에 개인 지급 여부 저장 금지.

지급 1회: 기존 `ledger_journals.idempotency_key = settlement:{trade_id}` 재사용 우선. mall persist 는 `settlement:{participation_id}` + UNIQUE. 새 금전 버킷 없음.

리셀러 ID: 새 컬럼 없음. `public.users.referral_code` 를 `resellerId` 로 표시. 기존 회원 backfill 초안만.

## 적용 전

1. 승인된 격리 QA Postgres dry-run만 (`CATALOG_TEST_DATABASE_URL`)
2. `operator-mall-product.isolation.cjs` · `operator-mall-product.persist.isolation.cjs` PASS
3. 운영 `DATABASE_URL` 적용 금지
4. S1 `supply_source` 가드 해제 금지
