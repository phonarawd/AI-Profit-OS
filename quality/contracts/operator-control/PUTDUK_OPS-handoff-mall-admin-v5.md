# PUTDUK_OPS 인수 — 운영자 상품 Admin API (mall-admin-v5)

다른 레포는 수정하지 않았다. 이 파일은 백엔드 계약 경로만 알린다.

## 계약 경로
- `quality/contracts/operator-control/manifest.json`
- `quality/contracts/operator-control/persist-status.v1.json`
- `quality/contracts/operator-control/product-admin-http.v5.json` (현재 상품 Admin HTTP · mall-admin-v5)
- `quality/contracts/operator-control/product-visibility-concurrent-participate.v1.json` (v4 스냅샷)
- `quality/contracts/operator-control/admin-session-login.v1.json`
- `quality/contracts/operator-control/admin-member-directory.v1.json`

## 구현됨 (코드). 운영 적용 아님
- Admin 상품 목록 GET `/api/v1/admin/opportunities/operator-products` (페이지·visibility·revision)
- Admin 상품 단건 GET `/api/v1/admin/opportunities/operator-products/:id`
- 수정/공개범위 `expectedRevision` · 충돌 409 · 기존 행 유지
- 등록 서버 멱등키 (`Idempotency-Key` 또는 body)
- 직원 로그인: 격리 QA persist 가 ready 일 때만 기존 `/admin-session/login` 이 자격 조회
- 회원 페이지 목록: 기존 `GET /admin/users` empty-q 가 격리 persist 에 연결

## GHA 일회용 PG (실측)
- run `34885649558` · job `104115531018` · SHA `87f033995ee0ee2e42d72eae8a809b2037f229a4`
- URL: https://github.com/phonarawd/AI-Profit-OS/actions/runs/34885649558
- 부모 구현 HEAD `9d48e58e` 이후. 상품 생성→목록→단건→수정→409→재조회·멱등·로그인·회원 목록·A/B/C·원장 QA 저널 지급 PASS
- 이 기록 커밋은 검증 SHA 이후. 지어낸 run ID 아님

## 아직 아님
- 운영 DB apply
- 정식 QA0–QA9
- 출시
- 운영 배포
- 라이브 `ledger_journals` 권위 (이번 실PG는 QA `operator_mall_settlement_journals`)
