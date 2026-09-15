# PUTDUK_OPS / PUTDUK_WEB 인수 — 운영자 쇼핑몰 + 실원장 (mall-ledger-v6)

다른 레포는 수정하지 않았다. 이 파일은 백엔드 계약 경로만 알린다.

## 최신 검증 backend commit
- 검증 SHA: `d626126c0083f82be993d028750088babd256ec2`
- 브랜치: `qa/operator-mall-pg-20260915`
- 부모 구현: `9d48e58e6fa0871611fe27292e8c876ee568a18c`
- 이 기록 커밋은 검증 SHA 이후. manifest `head` = 검증 SHA.

## 계약
- 버전: `2026-09-15.mall-ledger-v6`
- 경로: `quality/contracts/operator-control/manifest.json`
- 상품 HTTP: `product-admin-http.v6.json`
- persist 실태: `persist-status.v1.json`
- 로그인: `admin-session-login.v1.json`
- 회원 목록: `admin-member-directory.v1.json`
- 이전 스냅샷: `product-admin-http.v5.json` (QA 정산 표 권위), `product-visibility-concurrent-participate.v1.json` (v4)
- manifest hash는 기록 커밋의 `manifest.json` files[].fingerprint. 수동 복사 값 아님.

## 상품 API
- `GET /api/v1/admin/opportunities/operator-products` — 페이지·visibility·revision
- `GET /api/v1/admin/opportunities/operator-products/:id`
- `POST /api/v1/admin/opportunities/operator-products` — `Idempotency-Key` 또는 body `idempotencyKey`
- `PATCH /api/v1/admin/opportunities/:id/operator-product` — `expectedRevision`
- `PATCH /api/v1/admin/opportunities/:id/visibility` — `expectedRevision`
- 충돌 409 · 기존 행 유지
- 쿠키 PATCH에 CSRF 헤더 없으면 401
- 일반 opportunities API로 대체 금지

## 멱등키 · revision
- 등록 멱등: 헤더/바디 동일 키 → 두 번째 applied=false, SQL count=1
- 수정/공개: `expectedRevision` 불일치 409
- 지급 멱등: `settlement:{participationId}` · 동일 참여 저널 1행

## 회원 목록 · resellerId
- 직원 로그인: `POST /api/v1/admin-session/login` (email/password). JSON에 token 없음. user JWT로 Admin 불가.
- 회원 목록: `GET /api/v1/admin/users` empty-q. AdminGuard `users` read. GET은 CSRF 불필요.
- `resellerId` = `users.referral_code`. 가입 시 발급. UNIQUE. 재연결 동일. 인증 토큰 아님. ops backfill 미적용.

## 공용 / 선택 공개
- 기본 모델: 운영자 등록 공용 상품 + 다회원 참여. 외부 eBay/Amazon 파싱 재활성화 금지.
- `all_public`: 조건 충족 회원 동시 참여. A가 B 상품을 독점하지 않음. GHA에서 A/B 동시 + C도 전체 공개면 참여.
- `selected_members`: 지정 회원만. GHA에서 A/B 참여, C는 목록/상세/참여 404, SQL 2행.
- `private`: 신규 조회·참여 차단. 기존 참여 삭제 금지.
- 선택 공개는 권한이지 한 명 독점 예약이 아님.

## moneyAuthority와 실원장 완료 조건
- 참여 시작 시 `configuredPayoutUsdt` snapshot. 이후 상품 금액 변경이 snapshot을 바꾸지 않음.
- 서버 evaluator가 MATCH_SUCCESS를 판정한 뒤에만 지급. 애니메이션/클라이언트 값으로 지급 금지.
- `requireFx===true` 이고 FX snapshot 없으면 지급 없음 · 저널 0.
- 권위 표는 `ledger_journals` (+ entries/accounts). QA `operator_mall_settlement_journals`는 증명 표이며 권위 아님. 저널 없는 settled ≠ 완료.
- posting: 기존 `LedgerPostingService`. debit `SYS:OPPORTUNITY_POOL` · credit 회원 `profit`. 원금 lock/unlock 신설 없음. 풀 충전 저널 없음.
- `payoutAuthoritative=true`는 실제 `ledger_journals` 기록 + 금액 일치 후에만.
- `GET /api/v1/me/ledger/journals` 항목 id = DB journal id. B는 A 저널을 보지 않음.
- 버킷: A profit만 +snapshot. principal/locked/practice 불변. B 잔액 불변.
- 동시 두 요청 applied=1 · HTTP 유실 재시도 replay · Nest 재기동 재시도 journal count=1.
- practice 경로 금지.

## 유저 경로 (PUTDUK_WEB 호출)
- `GET /api/v1/opportunities` · `GET /api/v1/opportunities/:id` · `POST /api/v1/opportunities/:id/preflight` · `POST /api/v1/opportunities/:id/participate`
- 홈 피드는 같은 `listFeed`. `supply_source=operator` + visibility. `legacy_external` 숨김.
- 이 워크스페이스는 AI-Profit-OS 만. 웹/어드민 레포 파일은 가져오지 않는다.

## 미구현 · BLOCKED
- 출시 완료 / putduk-web 라이브 / main 병합 / 이 레포 Cloudflare production 재배포
- 운영 mall persist 경로(코드)는 열림. ops DDL 파일은 `supabase/migrations/20260916033000_*` · `20260916033100_*`. 웹/어드민 UI 수신은 각 레포에서 위 API를 호출한다.
- 정식 QA0–QA9 · ISSUED · 새 Human/PO ACK (아래 문구만 보고, AI가 ACK를 만들지 않음)
- 풀 재원 보충 규칙(누가 얼마를 넣는가) 미확정 → 추측 지급/충전 금지. 현재 posting은 시스템 계정 음수를 기존과 같이 허용할 뿐 운영 재원 정책이 아님.
- 진행 중 참여의 비공개 전환 취소 규칙 미확정
- QA7 공식 AI eval: workflow_dispatch + 별도 승인/토큰 필요
- 고객 웹/어드민 UI 수신(putduk-web) 미반영
- `verify:operator-row-protect` 의 live FOR UPDATE는 `CATALOG_TEST_DATABASE_URL` 없어 BLOCKED. GHA `row-protect` 스텝은 일회용 PG에서 FOR UPDATE 대기를 측정함.

## 격리 Nest+DB 통합 시험 (mock 아님)
운영 secret·운영 DB 사용 금지. GitHub `operator-mall-gha-pg` 워크플로만.

1. 브랜치 `qa/operator-mall-pg-20260915*` 푸시. hosted runner 일회용 Postgres.
2. prove: DB 이름 `aipo_qa_mall`, 앱 `DATABASE_URL` 없음, 운영 ref 없음.
3. draft SQL + 공식 `supabase/migrations` 원장 조각만 apply. 임시 원장 표 신설 금지.
4. `node tooling/verify/operator-mall-gha-pg.cjs --step=…` 순서로 product-http / concurrent / selected / reseller / ledger / login-directory / row-protect.
5. 성공 판정은 exit 0만이 아니라 로그 어서션과 artifact. 예: `ledger PASS official_journals fx_block concurrent_1 retry_1 restart_1 isolate_B http_match`, `selected PASS A/B participate C_404 sql=2`.
6. 이 절차는 정식 QA0–QA9가 아니다.

## GHA 실측
- run `34906126441` · SHA `d626126c0083f82be993d028750088babd256ec2`
- URL: https://github.com/phonarawd/AI-Profit-OS/actions/runs/34906126441
- 이전 그린(QA 정산 표 권위): `34885649558` @ `87f03399`, 계약 기록 `34886661200` @ `06f359e6`
- 원장 apply 수정 그린(선택 스텝 없음): `34897648785` @ `e8932c4d`
- 중간 실패(최종 아님): `34896504576`(가드 SQL 주석), `34905783882`(선택 목록 어서션이 공유 PG의 전체 공개 상품과 충돌)

## 아직 아님
- 운영 DB apply
- 정식 QA0–QA9
- ISSUED
- 출시
- 운영 배포
- 고객/어드민 웹 반영
