# PUTDUK_OPS 인수 — 운영자 상품 Admin API (mall-admin-v5)

다른 레포는 수정하지 않았다. 이 파일은 백엔드 계약 경로만 알린다.

## 계약 경로
- `quality/contracts/operator-control/manifest.json`
- `quality/contracts/operator-control/persist-status.v1.json`
- `quality/contracts/operator-control/product-admin-http.v5.json` (현재 상품 Admin HTTP · mall-admin-v5)
- `quality/contracts/operator-control/product-visibility-concurrent-participate.v1.json` (v4 스냅샷)
- `quality/contracts/operator-control/admin-session-login.v1.json`
- `quality/contracts/operator-control/admin-member-directory.v1.json`

## 구현됨 (백엔드 API). 다른 레포 코드는 가져오지 않음
- Admin 상품 목록 GET `/api/v1/admin/opportunities/operator-products` (페이지·visibility·revision)
- Admin 상품 단건 GET `/api/v1/admin/opportunities/operator-products/:id`
- 등록 POST `/api/v1/admin/opportunities/operator-products`
- 수정 PATCH `/api/v1/admin/opportunities/:id/operator-product` · 공개범위 PATCH `/api/v1/admin/opportunities/:id/visibility`
- 수정/공개범위 `expectedRevision` · 충돌 409 · 기존 행 유지
- 등록 서버 멱등키 (`Idempotency-Key` 또는 body)
- 운영 persist: Nest `PostgresService`(project `mgsytcetsiecllmhcyox`) + mall 스키마가 있으면 STORE_UNREADY 를 해제한다. 격리 QA URL 세탁 금지.
- 유저 `GET /api/v1/opportunities` · `GET /api/v1/opportunities/:id` · `POST /api/v1/opportunities/:id/participate` · 홈 피드(`listFeed`)는 `supply_source=operator` + visibility 만. `legacy_external` 숨김. 컬럼 없으면 42703 → 빈 목록/404.
- 외부 ingest 운영 잠금: `PRODUCTION_SOURCE_MODE=operator_only` · `ALLOW_EXTERNAL_PRODUCT_INGEST=false` · `ALLOW_LEGACY_EXTERNAL_WRITES=false` · writer → `SOURCE_DISABLED`. 재활성은 env+새 배포.
- 공식 DDL: `supabase/migrations/20260916033000_opportunities_supply_source.sql` · `supabase/migrations/20260916033100_operator_mall_product.sql`. 기존 행 DELETE 0.

## 라이브 스키마 (2026-09-16 · mgsytcetsiecllmhcyox)
- MCP `apply_migration` 적용: `opportunities.supply_source` · visibility/mall 컬럼 · `operator_mall_products` · `operator_mall_participations` · `operator_mall_settlement_journals`.
- 원격 스탬프 `20260915191718` / `20260915191740` (로컬 파일 `20260916033000` / `20260916033100`).
- `legacy_external` 행 DELETE 0 (적용 직후 115행).
- persist 프리플라이트 READY. Nest HTTP STORE_UNREADY 해제는 이 브랜치 SHA가 ops `DATABASE_URL` 로 기동된 뒤.
- 어드민 등록 POST 스모크는 시크릿 없이 하지 않음.

## 아직 아님
- 출시 완료 / putduk-web 라이브 / 이 레포 Cloudflare production 재배포
- 정식 QA0–QA9 · REL-502 formal rebase ACK
- 라이브 `ledger_journals` 권위를 mall 지급으로 승격하는 새 규칙
- 이 Cursor 워크스페이스는 AI-Profit-OS 만. putduk-web / PUTDUK_OPS 파일은 가져오지 않는다. 그쪽은 위 라이브 경로를 호출하면 된다.

## GHA 일회용 PG (실측)
- run `34885649558` · job `104115531018` · SHA `87f033995ee0ee2e42d72eae8a809b2037f229a4`
- URL: https://github.com/phonarawd/AI-Profit-OS/actions/runs/34885649558
- 부모 구현 HEAD `9d48e58e` 이후. 상품 생성→목록→단건→수정→409→재조회·멱등·로그인·회원 목록·A/B/C·원장 QA 저널 지급 PASS
- 이 기록 커밋은 검증 SHA 이후. 지어낸 run ID 아님
