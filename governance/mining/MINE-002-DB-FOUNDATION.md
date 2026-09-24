# MINE-002 데이터베이스·금융 기반

- 관측/적용일: 2026-09-20
- 상태: PASS
- 대상 Backend branch: `phase/mine-db-foundation-20260920`
- Supabase project: `mgsytcetsiecllmhcyox`
- Supabase applied migration: `20260920134053_mining_foundation_v1`
- 계약 기준: `contracts/mining/mining-contract.v1.json` (`2026-09-20.mine-v1`)

## 1. 원칙

광산 기능은 별도 balance 시스템을 만들지 않는다.

자금 권위는 기존 double-entry ledger와 user bucket에 계속 둔다.

- principal
- profit
- locked
- trial_principal
- trial_locked

광산 테이블은 광산 정의, 운용 상태, 원금 변동 사건, 발생수익, 정산 상태를 기록한다.

## 2. 신규 실DB 객체

### 테이블 9개

1. `mines`
2. `mine_rate_versions`
3. `mine_positions`
4. `mine_position_events`
5. `mine_accruals`
6. `mine_settlements`
7. `mine_settlement_accruals`
8. `mine_trial_sessions`
9. `mine_high_value_reviews`

### 뷰

- `mining_wallet_liability`

이 뷰는 기존 `wallet_buckets`에서만 계산하며 저장 잔액을 만들지 않는다.

- real liability = principal + profit + locked
- trial liability = trial_principal + trial_locked
- total mining liability = real + trial
- legacy `practice` bucket은 광산 책임금 계산에서 제외

## 3. 기존 ledger 확장

`ledger_accounts.account_kind` 허용값에 다음 하나를 추가했다.

- `mining_pool`

시스템 계정:

- `SYS:MINING_POOL`
- currency = `USDT`
- 생성 시 balance = 0

`ledger_journals.journal_type`에 다음을 추가했다.

- `mine_position_lock`
- `mine_position_unlock`
- `mine_profit_settlement`

백엔드 `ledger.types.ts`도 같은 vocabulary로 동기화했다.

`mining_pool`은 credit-normal pool로 분류하고, 세 mining journal type은 legacy `practice` bucket에 닿지 못하도록 기존 practice isolation 집합에 포함했다.

## 4. 정밀도

기존 ledger 실제 정밀도와 동일하게 모든 광산 금액 컬럼을:

`numeric(36,18)`

로 고정했다.

프론트/API 계약은 decimal string이며 IEEE float를 금융 권위로 사용하지 않는다.

## 5. 운용 원금 이력

`mine_positions`는 현재 운용 상태의 aggregate다.

증액/감액/종료 경계의 금융사실은 별도 불변 테이블 `mine_position_events`에 기록한다.

이벤트:

- START
- INCREASE
- DECREASE
- END

각 이벤트는:

- amount
- principal_before
- principal_after
- effective_at
- 정확히 하나의 `ledger_journal_id`
- `idempotency_key`

를 가진다.

DB check constraint가 이벤트별 before/after 산술을 강제한다.

`mine_position_events`는 UPDATE/DELETE 금지 trigger를 사용한다.

## 6. 발생수익/정산 중복 방지

`mine_accruals`는 불변 발생수익 구간이다.

각 구간은:

- position
- user
- mine
- rate version
- period start/end
- principal
- daily rate
- calculated profit
- calculator version/fingerprint

을 고정한다.

동일 position/rate/window 중복을 UNIQUE로 차단한다.

`mine_settlement_accruals`는 accrual 하나가 최대 한 settlement에만 포함되도록 `accrual_id UNIQUE`를 강제한다.

따라서 같은 accrual을 다른 settlement가 다시 소비하는 구조를 DB에서 차단한다.

`mine_settlements`는 동일 position + 동일 기간 중복도 UNIQUE로 차단한다.

`LEDGER_POSTED` 상태는 반드시 `ledger_journal_id`가 있어야 하며, credited profit과 calculated profit이 동일해야 한다.

## 7. 광산/수익률/운용 데이터 무결성

### Mine

상태:

- READY
- ACTIVE
- NEW_POSITIONS_PAUSED
- PAUSED
- ENDED

currency는 현재 ledger SoT와 맞춰 USDT만 허용한다.

### Rate version

상태:

- DRAFT
- APPROVAL_PENDING
- SCHEDULED
- ACTIVE
- ENDED

보호장치:

- mine별 version number UNIQUE
- mine별 ACTIVE rate 최대 1개
- 같은 effective_at 중복 금지
- approved_by와 created_by가 동일 관리자일 수 없음
- SCHEDULED/ACTIVE/ENDED는 effective_at 및 approved_at 필수

### Position

상태:

- START_PENDING
- ACTIVE
- DECREASE_PENDING
- END_PENDING
- ENDED

보호장치:

- ACTIVE면 principal > 0
- ENDED면 principal = 0
- 사용자+광산별 종료되지 않은 position 최대 1개
- start idempotency key UNIQUE

## 8. 체험/고액운용

`mine_trial_sessions`는 기존 `trial_grants`, `trial_principal`, `trial_locked`를 재사용한다.

독립 체험 잔액은 만들지 않았다.

`mine_high_value_reviews`에는 요청 당시 threshold를 snapshot 저장한다.

threshold는 이 테이블에 하드코딩하지 않는다. 이후 운영설정에서 결정된 값을 요청 시 기록한다.

고액 검토는 기존 `admin_approval_requests`와 연결 가능하게 했다.

## 9. 보안

신규 9개 테이블 모두:

- RLS ENABLED
- FORCE RLS
- anon SELECT = false
- authenticated SELECT = false
- Data API policy = 0 (deny-by-default)
- postgres/service_role 접근 유지

프론트가 Supabase 테이블을 직접 조작하는 경로는 만들지 않았다.

사용자/운영자 앱은 이후 Nest API를 통해서만 접근한다.

## 10. 실제 Supabase 검증 결과

read-only catalog assertion 결과:

- mining table count = 9
- RLS enabled all = true
- RLS forced all = true
- mining money columns = 15
- all mining money columns numeric(36,18) = true
- direct mining balance columns = 0
- `SYS:MINING_POOL` count = 1
- immutable financial trigger count = 3
- idempotency UNIQUE 확인 = PASS
- one-open-position unique index = PASS
- one-active-rate unique index = PASS
- settlement accrual unique = PASS
- ledger account-kind mining_pool extension = PASS
- ledger mining journal types extension = PASS
- liability projection mismatch = 0
- anon/authenticated read privileges = 0
- service_role actual table privilege = PASS

`information_schema.role_table_grants`는 service_role grant를 0으로 표시했으나 `has_table_privilege()` 실측에서는 신규 객체의 service_role SELECT/INSERT가 true임을 확인했다. 따라서 정보스키마 표시값을 실패로 오판하지 않는다.

## 11. 테스트/실행환경 기록

변경한 `ledger.types.ts`는 독립 TypeScript 5.8.3 `tsc --noEmit` 검증 PASS.

Node 22 type-stripping runtime에서:

- `mine_profit_settlement` 존재
- `mining_pool` credit-normal 분류
- `mine_position_lock` practice-forbidden 분류

PASS.

전체 저장소 clone/typecheck는 현재 실행환경에서 `github.com` DNS가 차단되어 clone 단계 자체가 불가능했다. 이는 코드/테스트 실패가 아니라 실행환경 네트워크 제한이다.

Supabase `execute_sql`은 현재 read-only transaction이므로 rollback 전제 INSERT 기반 constraint 실험은 수행 불가했다. 대신 실제 DB catalog의 CHECK/UNIQUE/FK/index/RLS/privilege를 직접 검증했다.

GitHub Actions는 계정 사용량 소진 상태이므로 새 실행을 만들지 않았다.

## 12. Migration 정합화

Supabase `apply_migration`이 실제 기록한 버전은:

`20260920134053_mining_foundation_v1`

따라서 저장소 migration 파일도 정확히:

`supabase/migrations/20260920134053_mining_foundation_v1.sql`

로 맞췄다.

초기 로컬 이름 `20260920224000_mining_foundation_v1.sql`은 제거하여 future migration drift를 방지했다.

## 13. PHASE 02 Verdict

`MINE-002 = PASS`

완료조건:

- 독립 balance 생성 = 0
- 광산 직접 balance column = 0
- 기존 ledger/wallet 재사용 = PASS
- 신규 광산 schema 실제 Supabase 적용 = PASS
- 정밀도 ledger와 동일 = PASS
- 멱등성/중복정산 방지 schema = PASS
- RLS deny-by-default = PASS
- migration repo/DB version drift = 0

다음 단계는 오직:

`PHASE 03 — Rust 수익계산 엔진`

관리자 명시 지시 전 자동 착수 금지.
