# MINE-004 운용·자동정산 API

- 완료일: 2026-09-21
- 상태: PASS
- 통합 브랜치: `phase/mine-operations-settlement-api-integrated-20260921`
- 계약: `contracts/mining/mining-contract.v1.json` (`2026-09-20.mine-v1`)
- 기준 DB: Supabase project `mgsytcetsiecllmhcyox`

## 1. 중복 작업 정리

PHASE 04 진행 중 동시 작업으로 아래 두 브랜치가 중복 구현된 사실을 확인했다.

- `phase/mine-operations-settlement-api-20260920`
- `phase/mine-operation-settlement-api-20260921`

둘을 직접 병합하지 않았다.

선행 브랜치의 올바른 main 계보를 기준으로 새 통합 브랜치 `phase/mine-operations-settlement-api-integrated-20260921`를 만들고, 금융 정합성이 더 강한 DB `FOR UPDATE` 기반 운용/정산 코어와 필요한 자동정산 구성만 선별 통합했다.

PHASE 05 범위인 관리자 정산 controller는 PHASE 04에 포함하지 않았다.

기존 두 중복 브랜치는 증거 보존용으로 삭제/force-reset하지 않았다.

## 2. 사용자 읽기 API

구현 범위:

- `GET /api/v1/mines`
- `GET /api/v1/mines/:mineId`
- `GET /api/v1/mining/me/summary`
- `GET /api/v1/mining/me/positions`
- `GET /api/v1/mining/me/positions/:positionId`
- `GET /api/v1/mining/me/settlements`

잠긴 wire field를 사용한다.

- `mineId`
- `positionId`
- `settlementId`
- `principalAmount`
- `assetCode`
- `currentDailyRate`
- `accruedProfitAmount`
- `baselineAt`
- `nextSettlementAt`
- `periodStartAt`
- `periodEndAt`
- `profitAmount`
- `ledgerJournalId`

발생 중 수익은 마지막 완료 정산, 마지막 원금 이벤트, 현재 수익률 적용시각 중 가장 늦은 경계 이후만 Rust 계산엔진으로 계산한다.

## 3. 사용자 운용 mutation

구현 범위:

- `POST /api/v1/mining/positions/start`
- `POST /api/v1/mining/positions/:positionId/increase`
- `POST /api/v1/mining/positions/:positionId/decrease`
- `POST /api/v1/mining/positions/:positionId/end`

계약 body:

- 시작: `mineId`, `principalAmount`, `assetCode`
- 증액/감액: `principalAmount`, `assetCode`
- 종료: 금액 없음

모든 mutation은 `Idempotency-Key` 필수다.

사용자 금융 이동은 기존 `LedgerPostingService`만 사용한다.

- 시작/증액: principal -> locked
- 감액/종료: locked -> principal

새 광산 balance 체계는 만들지 않았다.

## 4. 발생수익·정산

정산 코어는 PHASE 03 Rust 계산엔진의 `calculate_mining_profit()`만 사용한다.

TypeScript에 금융 산식을 복제하지 않았다.

정산 구간은 다음 경계를 기준으로 분할한다.

- 원금 START / INCREASE / DECREASE / END event
- 수익률 effective/ended boundary
- settlement period start/end

각 구간은 `mine_accruals` 불변 row로 저장하고 calculator version/fingerprint를 고정한다.

`mine_settlement_accruals`는 동일 accrual의 다른 settlement 재사용을 DB UNIQUE로 차단한다.

## 5. profit 원장 반영

정산 확정 journal:

- journal type: `mine_profit_settlement`
- debit: `SYS:MINING_POOL`
- credit: user `profit`
- stable idempotency key: `mine:settlement:ledger:<settlementId>`

같은 settlement가 이미 `LEDGER_POSTED`면 즉시 재사용하고 추가 지급하지 않는다.

기존 ledger가 제공하는 다음 보호장치를 그대로 재사용한다.

- idempotency key UNIQUE
- semantic request fingerprint
- account ASC row lock
- double-entry balance check
- same-transaction ledger outbox

## 6. 자동 일일정산

내부 endpoint:

- `POST /api/v1/internal/mining/settlement-tick`

보호:

- header `x-internal-mining-token`
- env `INTERNAL_MINING_TICK_TOKEN`
- token 미설정/불일치 시 fail closed

UTC 일 경계를 기준으로 ACTIVE position을 제한 batch로 정산한다.

운용 mutation과 자동정산은 Postgres advisory transaction lock을 통해 다중 API 인스턴스에서 동시에 금융 상태를 변경하지 않게 직렬화한다.

현재 PHASE 04에서는 correctness를 우선하여 mining write 전체를 직렬화한다. 세분화된 고성능 lock 전략은 PHASE 21 성능 검증 이전에 금융 안전성을 훼손하지 않는 범위에서만 최적화한다.

## 7. 실패·재시도 안전

settlement 상태:

- `CALC_PENDING`
- `CALCULATED`
- `LEDGER_POSTED`
- `FAILED`
- `REVIEW_REQUIRED`

실패 시 `FAILED`와 내부 failure code를 기록할 수 있으나 사용자 API는 내부 failure code를 직접 노출하지 않는다.

같은 settlement 재시도 시 동일 settlement ID와 동일 ledger idempotency key를 사용하므로 중복 profit 지급을 금지한다.

PHASE 05에서 관리자 조회/재실행 API를 별도로 연결한다.

## 8. API 계약 drift 수정

중복 작업본에서 발견된 다음 drift를 통합 과정에서 제거했다.

- user body `amountUsdt` -> `principalAmount`
- user body `principalUsdt` -> `principalAmount`
- response `id` -> 계약별 `mineId` / `positionId` / `settlementId`
- response `principalUsdt` -> `principalAmount`
- response `dailyRate` -> `currentDailyRate`
- global prefix와 controller의 `/api/v1` 이중 prefix 제거
- PHASE 05 관리자 controller의 PHASE 04 혼입 제거

## 9. PHASE 04 정적 계약 gate

파일:

- `quality/mining/phase04_api_assertions.mjs`

검증 대상:

- global API prefix drift
- user route contract
- `principalAmount` / `assetCode`
- `Idempotency-Key`
- legacy amount field 누출
- process-local mutation lock 금지
- Postgres advisory lock 존재
- stable settlement ledger idempotency key
- `LEDGER_POSTED` replay guard
- internal daily settlement auth
- PHASE 05 admin controller 혼입 금지
- 계약 read field 존재

검증 환경:

- Render temporary verification service: `putduk-mine-phase04-contract-verify`
- service id: `srv-dao0do8ae00c73aar74g`
- deploy id: `dep-dao0dp8ae00c73aar9dg`
- exact checkout: `b13588d541ce2e6cf9290d275bdb2e9a22a291c1`

결과:

- `PHASE04_API_ASSERTIONS_PASS`
- `PHASE04_CONTRACT_VERIFY_OK`
- deploy status: `live`

## 10. Rust + Nest fresh checkout gate

Temporary verification service:

- name: `putduk-mine-phase04-integrated-verify`
- service id: `srv-dao08b6gekts73adrjvg`
- deploy id: `dep-dao0d40473hc73avtrqg`
- exact executable-code checkout: `23ff2085aafac55be2e5e2016575999dca2a8b4e`

실행 gate:

```text
cargo fmt --check
cargo test
cargo check
cargo build --release --bin mining_profit_cli
pnpm --filter @aipo/api-nest... build
test -x services/engine-rust/target/release/mining_profit_cli
```

결과:

- Rust fmt: PASS
- Rust tests: 19 passed / 0 failed
- Rust cargo check: PASS
- release `mining_profit_cli`: PASS
- Nest TypeScript build: PASS
- `PHASE04_VERIFY_OK`
- deploy status: `live`

GitHub Actions:

- `NOT RUN / quota exhausted`
- GitHub Actions를 실행하지 않은 상태를 PASS로 기록하지 않는다.

## 11. 실 Supabase read-only gate

운영 DB에 mutation을 넣지 않고 catalog/data count를 read-only 확인했다.

결과:

- `mine_positions` = 0
- `mine_position_events` = 0
- `mine_accruals` = 0
- `mine_settlements` = 0
- `mine_settlement_accruals` = 0
- `SYS:MINING_POOL` = 1
- position start idempotency UNIQUE = true
- position event idempotency UNIQUE = true
- accrual fingerprint UNIQUE = true
- settlement idempotency UNIQUE = true
- settlement window UNIQUE = true
- accrual single-assignment UNIQUE = true
- one-open-position index = true
- settlement status/period index = true

PHASE 04에서는 신규 Supabase migration을 추가하지 않았다.

## 12. 배포 경계 결정

2026-09-21 founder/admin 결정으로 배포 경계를 고정했다.

- User Web: Cloudflare
- Admin/Ops: Cloudflare
- DNS / public API hostname: Cloudflare
- Backend: 신규 PUTDUK 광산 전용 Render service
- DB / ledger / mining storage: Supabase
- 기존 reseller/eBay Render: 동결, 광산에 재사용 금지
- Vercel: 사용 금지

상세 규칙:

- `governance/mining/MINE-DEPLOYMENT-BOUNDARY.md`

실제 production mining Render service 생성/도메인 연결은 출시/배포 단계에서 수행한다. PHASE 04에서 기존 production Render service는 변경하지 않았다.

## 13. PHASE 04 Verdict

`MINE-004 = PASS`

완료조건:

- 사용자 광산 조회 API = PASS
- 운용 시작/증액/감액/종료 = PASS
- Rust 발생수익 계산 연동 = PASS
- 일일정산 흐름 = PASS
- profit ledger posting = PASS
- 정산 재실행 stable idempotency = PASS
- DB 중복방지 constraints = PASS
- user API contract drift = 0
- PHASE 05 admin API 혼입 = 0
- fresh checkout Rust/Nest build = PASS
- production DB destructive change = 0

다음 단계는 오직:

`PHASE 05 — 관리자 API`

관리자 명시 지시 전 착수 금지.
