# MINE-005 관리자 API

- 완료일: 2026-09-21
- 상태: PASS
- 브랜치: `phase/mine-admin-api-20260921`
- PHASE 04 기준 SHA: `a79826aaeb7f97b70fae881f1d423ce0f70a49fe`
- 최종 검증 executable-code SHA: `73bced603c74af716a1f43df8e135947f4bfa3d6`
- 계약: `contracts/mining/mining-contract.v1.json` (`2026-09-20.mine-v1`)
- 운영 DB: Supabase `mgsytcetsiecllmhcyox`

## 1. 구현 범위

PHASE 05에서 잠긴 관리자 계약의 20개 광산 관리 API를 구현했다.

광산:
- `GET /api/v1/admin/mines`
- `POST /api/v1/admin/mines`
- `GET /api/v1/admin/mines/:mineId`
- `PATCH /api/v1/admin/mines/:mineId`
- `POST /api/v1/admin/mines/:mineId/publish`
- `POST /api/v1/admin/mines/:mineId/pause-new-positions`
- `POST /api/v1/admin/mines/:mineId/pause`
- `POST /api/v1/admin/mines/:mineId/resume`
- `POST /api/v1/admin/mines/:mineId/end`

수익률:
- `GET /api/v1/admin/mines/:mineId/rates`
- `POST /api/v1/admin/mines/:mineId/rates`
- `PATCH /api/v1/admin/mines/:mineId/rates/:rateVersionId`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/request-approval`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/approve`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/schedule`

운용/정산:
- `GET /api/v1/admin/mining/positions`
- `GET /api/v1/admin/mining/positions/:positionId`
- `GET /api/v1/admin/mining/settlements`
- `GET /api/v1/admin/mining/settlements/:settlementId`
- `POST /api/v1/admin/mining/settlements/:settlementId/retry`

PHASE 11 체험 설정과 PHASE 17 고액운용 API는 PHASE 05에 혼입하지 않았다.

## 2. 관리자 인증 / RBAC

모든 `MiningAdminController` route는 기존 `AdminGuard`를 사용한다.

기존 deny-by-default 규칙을 유지한다.

- capability 분류가 없는 관리자 handler는 `super` 포함 전부 거부
- 새 mining admin handler 20개는 모두 `admin-capabilities.ts`에 명시 분류
- canonical RBAC vocabulary만 사용

주요 분류:
- 광산/수익률 구조 변경: `all/write`
- 광산 긴급정지/신규운용중지: `circuit/write`
- 운용/정산 조회: `ledger/read`
- 정산 재실행: `balanceAdjust/write`

기존 RBAC role vocabulary를 새 mining 전용 권한명으로 임의 확장하지 않았다.

## 3. 관리자 mutation 멱등성

관리자 mutation은 기존 `admin_audit_events`를 멱등성 레지스트리 겸 audit authority로 재사용한다.

보호:
- `admin_audit_events.idempotency_key` UNIQUE
- Postgres transaction advisory lock on request key
- SHA-256 semantic fingerprint
- 같은 idempotency key + 같은 semantic request = 기존 resource 재사용
- 같은 idempotency key + 다른 request = conflict
- audit payload에는 `fingerprint`, `resourceId`만 저장

별도 balance/idempotency 금융 시스템은 만들지 않았다.

## 4. 수익률 maker/checker

기존 `admin_approval_requests`를 재사용한다.

흐름:
1. DRAFT 생성
2. DRAFT 수정
3. approval request 생성 -> `APPROVAL_PENDING`
4. 다른 관리자 identity가 승인
5. 승인된 버전을 즉시/미래 effective time에 예약
6. due 시 ACTIVE 전환

서버와 DB 양쪽에서 self approval을 차단한다.

실 DB 검증:
- `checker_admin_id <> maker_admin_id` CHECK 존재
- maker/checker `admin_rbac` FK 존재
- approval status CHECK 존재
- approval reason 길이 CHECK 존재

## 5. 예약 수익률 경계

미래 수익률은 `SCHEDULED`로 저장한다.

`MiningRateActivationService`는 due rate를 다음 방식으로 활성화한다.

- 종료된 mine은 activation 대상에서 제외
- mine row를 transaction `FOR UPDATE`
- due SCHEDULED row를 재검증
- 기존 ACTIVE rate의 `ended_at`을 새 rate의 정확한 `effective_at`으로 기록
- 새 rate를 ACTIVE로 전환

일일 settlement tick은 반드시:

1. internal token 검증
2. settlement kill-switch 검사
3. due rate activation
4. daily settlement

순으로 실행한다.

따라서 `MINING_SETTLEMENT_PAUSE` 또는 상위 money/global circuit가 열려 있으면 rate activation도 시작되지 않는다.

## 6. 사용자 live accrued profit과 예약 수익률

수익률이 settlement 사이에서 변경되더라도 사용자 발생 중 수익 표시가 이전 구간을 잃지 않도록 `MiningReadService`를 보강했다.

live accrued 계산은 마지막 완료 settlement/원금 event 기준 이후의:
- ACTIVE rate
- ENDED rate
- 승인된 due SCHEDULED rate

구간을 effective/ended boundary로 분할하고, 각 구간을 PHASE 03 Rust 엔진으로 계산한 뒤 fixed-point 금액 합산한다.

TypeScript가 mining profit 산식을 복제하지 않는다.

## 7. 광산 상태 제어

per-mine 상태:
- publish -> ACTIVE
- pause-new-positions -> NEW_POSITIONS_PAUSED
- emergency pause -> PAUSED
- resume -> ACTIVE
- end -> ENDED

안전 조건:
- publish/resume은 적용 가능한 승인 rate 필요
- 종료된 mine은 재개/수정 제한
- open position이 있으면 mine END 거부
- mine END 시 기존 ACTIVE rate도 동일 종료시각으로 END

## 8. 전체 신규운용중지 / 정산보류

잠긴 mining contract에 별도 신규 route를 추가하지 않았다.

기존 server-enforced system control API를 재사용한다.

- `GET /api/v1/admin/system-control/switches`
- `PUT /api/v1/admin/system-control/switches`

신규 switch IDs:
- `MINING_NEW_POSITIONS_PAUSE`
- `MINING_SETTLEMENT_PAUSE`

서버 강제 경로:
- position start -> `mining_new_positions`
- increase/decrease/end -> settlement required path
- daily settlement -> `mining_settlement`
- admin settlement retry -> `mining_settlement`

`MONEY_CIRCUIT` 및 `GLOBAL_ALL_PAUSE`의 기존 상위 차단도 그대로 적용된다.

## 9. Supabase migration

repo migration:
- `supabase/migrations/20260921162500_mining_admin_controls_v1.sql`

production 적용:
- migration name: `mining_admin_controls_v1`
- result: SUCCESS

변경 내용:
- 기존 `admin_kill_switches_id_check`에 mining switch 2개 additive 확장
- 두 switch row를 `engaged=false`로 seed

금융 ledger/balance/schema authority 변경 없음.

적용 후 검증:
- `MINING_NEW_POSITIONS_PAUSE=false`
- `MINING_SETTLEMENT_PAUSE=false`
- mining tables RLS=true / FORCE RLS=true 유지
- production mines/rates/positions/settlements = 0 at validation time

## 10. PHASE 05 정적 gate

파일:
- `quality/mining/phase05_admin_api_assertions.mjs`

검증 항목:
- locked contract의 20개 method/path
- AdminGuard 존재
- global `/api/v1` double-prefix 없음
- 모든 mutation `Idempotency-Key`
- 20개 handler RBAC 분류
- maker/checker 분리
- admin audit idempotency + semantic fingerprint
- mining kill-switch 코드/DB/server enforcement
- runtime kill-switch evaluation
- rate activation wiring
- settlement hold가 rate activation보다 먼저 평가됨
- 종료 mine rate activation 차단
- exact rate boundary
- multi-rate live accrued summation
- PHASE 11/17 API 혼입 없음

결과:
- `PHASE05_ADMIN_API_ASSERTIONS_PASS`

## 11. Fresh checkout validation

Temporary validation-only Render service:
- name: `putduk-mine-phase05-admin-verify`
- service id: `srv-dao0memk1f9s73a8hplg`
- final deploy id: `dep-dao0ppmk1f9s73a8t6o0`
- exact checkout: `73bced603c74af716a1f43df8e135947f4bfa3d6`
- deploy status: `live`

Gate:
```text
node quality/mining/phase05_admin_api_assertions.mjs
cargo fmt --check
cargo test
cargo check
pnpm --filter @aipo/api-nest... build
```

Results:
- PHASE05 admin contract/RBAC gate: PASS
- Rust fmt: PASS
- Rust tests: 19 passed / 0 failed
- Rust cargo check: PASS
- Nest TypeScript build: PASS
- `PHASE05_VERIFY_OK`
- deploy: live

This service is temporary validation infrastructure and is not the legacy reseller/eBay Render service.
No legacy reseller/eBay Render production service was modified.

GitHub Actions:
- `NOT RUN / quota exhausted`

## 12. Production authority verification

Read-only production checks confirmed:
- `admin_audit_events.idempotency_key` UNIQUE
- audit payload JSONB / target ID text schema matches implementation
- approval no-self-check DB constraint exists
- maker/checker FKs exist
- mining RLS + FORCE RLS remain enabled
- mining switch rows exist and remain disengaged after migration

No test mine, position, accrual, settlement, or money movement was inserted into production during PHASE 05 validation.

## 13. Verdict

`MINE-005 = PASS`

PHASE 05 completion conditions:
- mine management API = PASS
- rate draft/request/approve/schedule/history = PASS
- maker/checker = PASS
- position admin reads = PASS
- settlement admin reads/retry = PASS
- emergency mine pause = PASS
- global new-position hold = PASS
- global settlement hold = PASS
- server enforcement = PASS
- admin mutation idempotency = PASS
- RBAC classification gaps = 0
- locked admin API route drift = 0
- fresh checkout Rust/Nest build = PASS
- production DB financial mutation during validation = 0

다음 단계는 오직:

`PHASE 06 — putduk-ops 광산 운영콘솔`

관리자 명시 지시 전 착수 금지.
