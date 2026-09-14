# Draft only — 운영 DDL 실행 금지

대상: 운영자 쇼핑몰형 공용 상품 공개 범위 · 참여 snapshot. `supabase/migrations` 에 넣지 않음.

## 의도 (미적용)

`public.opportunities` 추가 컬럼 초안:

- `visibility` text not null default `all_public` check (`all_public` | `selected_members` | `private`)
- `selected_member_ids` uuid[] not null default `{}`
- `composition_qty` integer null — 구성 수량. 판매 가능 재고 아님
- `product_revision` integer not null default 1

참여 snapshot은 기존 `participate_requests` / `trade_executions` 회원별 행에 고정. 상품 전체 행에 개인 지급 여부 저장 금지.

지급 1회: 기존 `ledger_journals.idempotency_key = settlement:{trade_id}` 재사용. 새 금전 버킷 없음.

리셀러 ID: 새 컬럼 없음. `public.users.referral_code` 를 `resellerId` 로 표시.

## 적용 전

1. 승인된 격리 QA Postgres dry-run만
2. `operator-mall-product.isolation.cjs` PASS
3. 운영 `DATABASE_URL` 적용 금지
4. S1 `supply_source` 가드 해제 금지
