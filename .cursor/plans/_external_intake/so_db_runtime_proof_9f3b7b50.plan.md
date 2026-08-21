---
name: SO DB Runtime Proof
overview: 로컬 Windows PostgreSQL 18에만 기존 source_observations migration을 적용하고, 실제 automated TCG/eBay SourceObservation을 append한 뒤 별도 프로세스에서 다시 읽어 V2 MATCH를 재현한다. production Supabase에는 손대지 않는다.
todos:
  - id: git-gate0
    content: Git read-only 확인 후, governance 변경 전에 기존 runtime/V1/V2/live-match/canonical/durable verifier Gate 0 실행
    status: completed
  - id: safe-db-identity
    content: 명시 SAFE URL + localhost + dedicated DB name(putduk_sourceobs_test류). postgres 기본 DB면 BLOCKED_NOT_DEDICATED STOP
    status: completed
  - id: apply-migration-local
    content: 원본 SQL을 전용 로컬 DB에만 적용. role stub=MIGRATION_COMPATIBILITY_ONLY. SQL 완화/TRUNCATE/생산 MCP 금지
    status: cancelled
  - id: cross-process-verifier
    content: verifier-only pg DI, Process A/B, obs_verify_* 잔류, TRUNCATE/UPDATE/DELETE 0, V2 MATCH from DB rows
    status: completed
  - id: governance-if-pass
    content: OBSERVATION_DB_RUNTIME=PASS는 local-test 범위 필드와 함께. PRODUCTION persistence는 NOT_IMPLEMENTED 유지
    status: cancelled
  - id: bounded-report-stop
    content: bounded regression 재실행 후 요청 FINAL REPORT 서식으로 보고 STOP. commit/push/next slice 0
    status: completed
isProject: false
---

# PUTDUK SourceObservation DB Runtime Proof

## 현재 조사 결과 (read-only)

- HEAD = `0345206ad2e7238658454db5d072c8fbf93dbb37` (요청 Known HEAD와 일치)
- Worktree = DIRTY. 다른 세션 tracked dirty(UI/Home/Opportunity/Money/`package.json`/`CATALOG.md`/`domain-by-path.cjs`/`services/market-intelligence/package.json`/`index.cjs`)는 열지 않는다. commit/push/stash/reset/restore/clean = NO
- `.env` `DATABASE_URL` = production 전용 (`aws-0-ap-northeast-2.pooler.supabase.com` / user `postgres.mgsytcetsiecllmhcyox`). **WRITE 금지. fallback 금지.**
- Supabase preview/dev branch = 0. Docker daemon = OFF
- 허용 후보: Windows 서비스 `postgresql-x64-18`가 `localhost:5432` listen (Docker 아님, production 아님)
- `TEST_DATABASE_URL` / `SAFE_DATABASE_URL` / pgpass = 현재 없음. Founder가 실행 전 전용 URL을 제공한다
- 기존 durable repo는 이미 구현됨: [`repository.postgres.cjs`](services/market-intelligence/src/source-observation/repository.postgres.cjs) (`INSERT ON CONFLICT (id) DO NOTHING`, memory fallback 0). `classifyDurableDatabaseUrl()`은 `mgsytcetsiecllmhcyox` / `supabase.co`를 `BLOCKED_NO_SAFE_DB`로 거부. localhost는 통과
- Migration 파일 존재, 내용 유지 대상: [`supabase/migrations/20260819210000_source_observations.sql`](supabase/migrations/20260819210000_source_observations.sql) (append-only trigger, `id` PK, `(source, external_item_id)` UNIQUE 없음, RLS, listing FK 없음). **새 migration / 완화 금지**
- `pg` 패키지는 [`services/api-nest`](services/api-nest/package.json)에만 있음. **repository는 querier DI 유지, `pg` import 0.** verifier 파일만 `require(.../services/api-nest/node_modules/pg)` 임시 재사용. `PRODUCTION_PG_CLIENT_WIRING = NOT_IMPLEMENTED`
- 기존 governance 의미: `OBSERVATION_DB_RUNTIME` = 실제 Postgres runtime (값 `BLOCKED_NO_SAFE_DB`). production 완료 플래그는 별도 `PRODUCTION_OBSERVATION_PERSISTENCE`. memory 주석의 `BLOCKED_LOCAL_ENV`는 구 표현. 필드 이름만 보고 production과 동일시하지 않는다
- 기존 verifier는 governance가 `OBSERVATION_DB_RUNTIME === BLOCKED_NO_SAFE_DB`일 때만 PASS한다. proof PASS 후에만 그 assertion을 정직하게 갱신한다

```mermaid
sequenceDiagram
  participant Parent as VerifierParent
  participant Write as NodeProcessA
  participant DB as LocalPG18
  participant Read as NodeProcessB
  participant V2 as MatchV2

  Parent->>Parent as Gate0ExistingVerifiers
  Parent->>DB as ClassifySafeUrlAndApplyMigration
  Parent->>Write as SpawnWrite
  Write->>Write as LiveTCG113669AndEbay377416817781
  Write->>DB as appendObservation
  Write->>Write as IdempotentConflictHistoryThenEnd
  Parent->>Read as SpawnReadFreshClient
  Read->>DB as getByObservationId
  Read->>V2 as matchSourceObservationsV2FromDbRowsOnly
  Read->>Read as InMemoryCanonicalProductNoDb
```

## 실행 순서

### 0. Git safety

작업 시작 시 `git rev-parse HEAD` / `git status --short` / `git diff --name-only`만. 다른 세션 dirty 파일을 이번 slice 때문에 수정하지 않는다.

### 1. FIRST GATE — safe URL 실체 확인

실행 시점에만 아래 **명시 env**를 읽는다. 이름만 보고 추정하지 않는다.

- 허용 키: `SOURCE_OBSERVATION_SAFE_DATABASE_URL` 또는 `TEST_DATABASE_URL` 또는 `SAFE_DATABASE_URL`
- **금지 키:** `.env` `DATABASE_URL` (production). 비어 있으면 production으로 대체하지 않는다

확인 최소치 (localhost만으로는 SAFE 아님):

- `classifyDurableDatabaseUrl(url)` → `ok`
- `SAFE_HOST`: host ∈ `localhost` / `127.0.0.1` / `::1`
- `PRODUCTION_PROJECT_REF_ABSENT`: URL/user에 `mgsytcetsiecllmhcyox` / `supabase.co` 없음
- 접속 후 `current_database()`가 PUTDUK proof **전용** DB (`putduk_sourceobs_test` 또는 `putduk_*sourceobs*_test` / `putduk_*so*_runtime*` 형태). `postgres` / `template1` / 불명 일반 DB면 write 0
- 기록: `SAFE_DB_ENVIRONMENT=FOUND`, `SAFE_DB_KIND=DEDICATED_LOCAL_TEST_POSTGRES`, `DB_IS_PRODUCTION=NO`

판정:

- URL 없음 / production / Supabase → `SAFE_DB_ENVIRONMENT=NOT_FOUND` 또는 `BLOCKED_PRODUCTION_URL` → STOP
- host는 local인데 DB가 `postgres` 등 비전용 → `SAFE_DB_ENVIRONMENT=BLOCKED_NOT_DEDICATED` → STOP
- `SAFE_HOST` + `DEDICATED_DATABASE=YES` + `PRODUCTION_PROJECT_REF_ABSENT=YES` → `FOUND`

비밀번호 추측, Docker 기동, Supabase preview 생성, SQLite/JSON/memory fallback, production 대체 = 금지.

### 2. Gate 0 — 기존 closed truth (DB write 전, governance 변경 전)

그대로 실행. 실패 시 matcher/parser/core를 고치지 말고 `PREVIOUS_RUNTIME_VERIFICATION=FAIL`로 STOP.

- `node tooling/verify/source-observation-runtime.cjs`
- `node tooling/verify/identity-matching-v1.cjs`
- `node tooling/verify/identity-matching-v2.cjs`
- `node services/market-intelligence/src/identity-matching/v2/live-automated-cross-source-match.cjs`
- `node tooling/verify/canonical-product.cjs`
- `node tooling/verify/source-observation-durable-persistence.cjs`

이 시점 governance/contract는 아직 `BLOCKED_NO_SAFE_DB`여야 기존 verifier가 PASS한다.

### 3. Migration apply — safe local PG only

**사용:** 기존 파일 그대로. `psql.exe` (`C:\Program Files\PostgreSQL\18\bin\psql.exe`) 또는 `pg` Client로 동일 SQL 적용.

**사용 금지:** Supabase MCP `apply_migration` (production project에 적용됨), `supabase db push`, production `DATABASE_URL`.

로컬 PG18에는 Supabase role (`anon` / `authenticated` / `service_role`)이 없을 수 있다. migration을 줄이거나 RLS를 끄지 않는다. 필요하면 **같은 전용 로컬 DB에 NOLOGIN stub role만 만든 뒤 원본 SQL을 재시도**한다. 이는 `LOCAL_SUPABASE_ROLE_STUBS=MIGRATION_COMPATIBILITY_ONLY`이며 `SUPABASE_ROLE_RUNTIME_PARITY=NOT_VERIFIED`. GRANT/REVOKE/trigger/CHECK를 파일에서 삭제하지 않는다.

적용 실패 → 정확한 error 보고 후 STOP. 수동 schema 우회 금지.

`tooling/verify/fixtures/migrations-applied.v1.json`은 production applied SSOT이므로 **수정 금지**. test apply ≠ production applied.

### 4. 신규 verifier (CATALOG 등록 없음)

추가만: [`tooling/verify/source-observation-db-runtime.cjs`](tooling/verify/source-observation-db-runtime.cjs)

`package.json` / `CATALOG.md` / `domain-by-path.cjs` / MI `index.cjs` / MI `package.json` 손대지 않는다. `node`로 직접 실행.

기존 [`repository.postgres.cjs`](services/market-intelligence/src/source-observation/repository.postgres.cjs) / [`persistence-mapper.cjs`](services/market-intelligence/src/source-observation/persistence-mapper.cjs) / contract·validate·schema **재설계 금지**.

권장 구조: parent가 `child_process.fork(__filename)`으로 process A/B를 분리.

**Process A (write, 종료 필수)**

- 기존 `observeProduct`로 live automated CONFIRMATION/SUCCESS만:
  - TCG `productId=113669`
  - eBay `itemId=377416817781` (기존 Browse bridge)
- fixture/manual/cached object 금지
- `appendObservation()` × 2 → 실제 INSERT evidence 있을 때만 `TCG/EBAY_DURABLE_WRITE=PASS`
- 동일 id/payload 재append → `IDEMPOTENT_SUCCESS`, 새 row 0, UPDATE 0
- conflict: **verifier-owned** `obs_verify_*`만 same id + different payload → `BLOCKED_CONFLICT`, live payload 변조 금지
- history: verifier-owned same source+externalItemId, 다른 `id`/`observedAt` → row count 2, overwrite 0
- sidecar에는 **id / fingerprint hash만**. observation JS 객체를 read/match 입력으로 넘기지 않음
- `repository.end()` 후 process exit

**Process B (fresh client + fresh repository)**

- writer 객체 재사용 0
- `getByObservationId`로 TCG/eBay 재조회
- canonical 비교: id, source, externalItemId, purpose, status, url, observedAt, identity/acquisition/extraction provenance, identity fields, contract price/image/availability
- mapper `PERSISTED_RECORD_PAYLOAD_CONFLICT` fail-closed 유지
- **DB에서 읽은 두 observation만** `matchSourceObservationsV2(...)`에 전달. 기대: `trading_card` / `MATCH` / `COMPOSITE_STRONG`
- `createCanonicalProductFromMatch(...)`는 in-process memory만. CanonicalProduct/PD/MatchResult DB insert 금지

Repository `UPDATE=0` `DELETE=0` `TRUNCATE=0`. verifier는 `obs_verify_<unique>`를 만들고 **전용 test DB에 남긴다**. 전체 정리는 proof 이후 별도 운영에서 test database 삭제로만.

### 5. RLS 보고 (정책 완화 · superuser PASS 과장 금지)

anon insert / public write / RLS disable 금지. 로컬 superuser INSERT/SELECT 성공 ≠ application role RLS 증명.

정확한 보고:

- `DB_RLS_SCHEMA_ENABLED = PASS` (migration RLS ON 확인)
- `DB_RLS_RUNTIME_CONNECTION = PASS_WITH_SUPERUSER_BYPASS`
- `DB_RLS_APPLICATION_ROLE_ENFORCEMENT = NOT_VERIFIED`
- `LOCAL_SUPABASE_ROLE_STUBS = MIGRATION_COMPATIBILITY_ONLY`
- `SUPABASE_ROLE_RUNTIME_PARITY = NOT_VERIFIED`

구 `DB_RLS_RUNTIME_ROLE_VERIFICATION=PASS` 단독 사용 금지.

### 6. Governance 갱신 — 실제 DB proof PASS일 때만

기존 정의부터 읽는다. `OBSERVATION_DB_RUNTIME`은 production persistence가 아니라 **실제 Postgres runtime** (`BLOCKED_NO_SAFE_DB`). production 완료는 `PRODUCTION_OBSERVATION_PERSISTENCE`.

따라서 local dedicated proof PASS 시:

- `OBSERVATION_DB_RUNTIME`: `BLOCKED_NO_SAFE_DB` → `PASS`
- `DURABLE_DB_RUNTIME_VERIFIED_ENVIRONMENT`: `LOCAL_TEST_POSTGRES`
- `PRODUCTION_OBSERVATION_PERSISTENCE`: **`NOT_IMPLEMENTED` 유지**
- `PRODUCTION_MIGRATION_APPLIED` / `supabaseMigrationApplied`: **NO/false 유지**
- `REMOTE_SUPABASE_RUNTIME_VERIFICATION`: `NOT_VERIFIED`
- `remoteWrite`: **false 유지**
- `PRODUCTION_PG_CLIENT_WIRING`: `NOT_IMPLEMENTED`

만약 이후 정의가 production runtime으로 바뀌면 `OBSERVATION_DB_RUNTIME`을 PASS로 올리지 않고 `LOCAL_DURABLE_DB_RUNTIME_VERIFIED=YES`만 쓴다. 지금은 production과 분리되어 있으므로 PASS + 환경 필드.

그 다음 기존 verifier의 **BLOCKED 고정 assertion만** 정직하게 맞춤 (안 바꾸면 Gate 0 파일이 회귀 FAIL):

- [`tooling/verify/source-observation-runtime.cjs`](tooling/verify/source-observation-runtime.cjs)
- [`tooling/verify/source-observation-durable-persistence.cjs`](tooling/verify/source-observation-durable-persistence.cjs)

matcher/v1/v2/canonical identity/PD allocator/Opportunity/UI는 수정하지 않는다.

proof가 BLOCKED면 governance를 PASS로 올리지 않는다.

### 7. Bounded regression + STOP

Playwright 앱 E2E 0 (TCG live acquisition의 기존 browser-rendered는 유지). web/api 동시 기동 0.

마지막에 같은 verifier 목록 + `node tooling/verify/source-observation-db-runtime.cjs`.

요청된 FINAL REPORT 형식으로 보고하고 **다음 slice 자동 착수 금지**. 권장 다음: `PUTDUK_CANONICAL_PRODUCT_AND_PD_DURABLE_PERSISTENCE` (검수 후).

이번 slice 이후에도 유지:

- `CANONICAL_PRODUCT_DURABLE_DB_PERSISTENCE=NOT_IMPLEMENTED`
- `PUTDUK_PRODUCT_ID_DURABLE_STABILITY=NOT_IMPLEMENTED`
- `MATCH_RESULT_DURABLE_PERSISTENCE=NOT_IMPLEMENTED`

## 수정 범위

- 추가: `tooling/verify/source-observation-db-runtime.cjs` (`--phase=write|read` child). `pg`는 이 파일에서만 해석. `repository.postgres.cjs`는 querier DI 유지
- PASS 시에만 수정: governance JSON, `contract.cjs` verdict, 위 두 기존 verifier의 DB-runtime assertion (환경 범위 필드 포함)
- 금지: migration 완화, TRUNCATE/DELETE cleanup, `migrations-applied.v1.json`, production write, protected dirty files, CanonicalProduct DB, MI/api `pg` production wiring

## 실행 전 Founder 제공물

전용 URL을 env로 줄 것. 채팅에 비밀번호를 붙여넣지 말 것. host는 localhost여야 하며 database name이 이 proof 전용인지 보고서에 그대로 기록한다.
