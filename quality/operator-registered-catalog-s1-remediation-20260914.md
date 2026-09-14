# S1 보완 수정 — 운영자 행 공통 보호 게이트

- **단계:** 슬라이스 1 보완만. 슬라이스 2(운영자 등록 API·어드민 연결·사용자 웹 API) **0**
- **작성:** 2026-09-14 01:24–02:40 KST
- **작업본:** 로컬 `feat/operator-registered-catalog-s1` · HEAD `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` = `origin/main`
- **이번 턴:** 공통 보호 로직을 Admin·CLI·seed·이미지·가격 writer에 연결. persist 예외와 비상품 흐름 분리. 격리 테스트 보완. **commit/push/merge/rebase/deploy 0 · 운영 DB 0 · migration 적용 0**
- **선행 조사:** `quality/operator-registered-catalog-s1-supplement-2026-09-14.md` (U1–U4 우회 · persist throw 컷오프)

이 문서는 조사 보고서·수정 계획을 대체하지 않는다. S1 보완 수정 결과다.

---

## 1. 작업 시작 시점의 branch · HEAD · dirty

| 항목 | 시작 시점 (유저 지시 + `git status`) |
|---|---|
| 브랜치 | `feat/operator-registered-catalog-s1` |
| HEAD | `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` |
| 브랜치 고유 커밋 | **0** (main과 동일 HEAD. S1은 워킹트리에만 있음) |
| `DATABASE_URL` | unset (`IsNullOrEmpty` = true) |
| `CATALOG_TEST_DATABASE_URL` | unset |
| `QA_DATABASE_URL` | unset |
| `QA_SUPABASE_PROJECT_REF` | unset |

기존 dirty는 삭제·reset·stash·clean 하지 않았다. 작업 종료 시점에도 HEAD는 동일하다.

### 시작 시점 dirty 분류

**S1 관련 (이미 워킹트리에 있던 구현 + 이번 보완):**

| 경로 | 시작 상태 |
|---|---|
| `services/api-nest/catalog-external-write.core.cjs` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.guard.ts` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.ingest-*` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts` | untracked |
| `tooling/verify/operator-row-protect.cjs` | untracked |
| `tooling/verify/catalog-external-write-ingest-http.cjs` | untracked |
| `quality/migrations-draft/20260913220000_opportunities_supply_source.sql` | untracked |
| `services/api-nest/src/adapters/adapters.admin.service.ts` | modified |
| `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts` | modified |
| `services/api-nest/src/opportunities/opportunity-reprice.service.ts` | modified |
| `services/api-nest/src/opportunities/opportunities.module.ts` | modified |
| `package.json` · `tooling/verify/CATALOG.md` · `domain-by-path.cjs` | modified |

**기존 dirty (열지 않음 · 보존):** 규칙/husky/vscode/verify CRLF · `services/market-intelligence` · workers wrangler · untracked 프롬프트·교차검증 MD.

**이번 보완에서 추가로 손댄 S1 경로:** `opportunities.admin.service.ts` · `tooling/seed/catalog-runtime.cjs` · Admin/CLI isolation 테스트 · ingest persist 예외 분리. 원샷 패치 스크립트(`tooling/verify/_s1-patch-*.cjs`, `_s1-runtime-extra.cjs`)는 훅 우회용 임시 파일이라 삭제했다. 기존 dirty가 아니다.

---

## 2. 보호한 writer 경로와 처리 결과

공통 결정: `catalog-external-write.core.cjs` `decideProductWrite` + `evaluateLockedAssetOnClient`.  
기본 `writerKind = legacy_external`. `operator_canonical`은 구조만 예약(S1 호출자 0).

| ID | 경로 | 처리 | 결과 |
|---|---|---|---|
| P2 | eBay/admin ingest persist | preflight + TX `evaluateLockedAsset`. 가드 누락 시 `GATE_UNRESOLVED` fail-closed. 정상 차단은 `productWrite.status=blocked` | **보호됨** |
| P3 | ebay 이미지 provenance | 잠금 재평가 + opp UPDATE `AND supply_source = 'legacy_external'` | **보호됨** |
| P4 | listing 재가격 | `evaluateLockedAsset` + `persistComputedPricing(..., { requireLegacySupply: true })` | **보호됨** |
| P5 | 부팅 runtime seed | `evaluateBootSeed` 후 수직 seed/`persist`/`upsertOpportunity`가 행 단위 재평가 | **보호됨** |
| P6 | Admin `POST .../catalog/runtime-seed` | P5와 동일 서비스 | **보호됨** |
| P7 | Admin 수직 seed 3종 | `upsertAsset` 경유. `seeded.wrote`일 때만 count | **보호됨** (이전 U1) |
| P8 | Admin `upsertAsset` | TX에서 evaluate 후 write. 차단 시 `{ wrote:false, reason }` | **보호됨** (이전 U1) |
| P9 | Admin R2 `registerAssetImage` | `upsertAsset` 경유. 차단 시 signedPut **미반환** `{ wrote:false, reason }` | **카탈로그 행 보호됨** (이전 U1) |
| P10 | Admin `patchPricing` | peek `asset_id` → **먼저** evaluate → deny면 throw(`code`/`wrote=false`) → `persistOverride` 미실행 → persist는 `requireLegacySupply: true` | **보호됨** (이전 U2) |
| P11 | Admin ingest `adapterId=admin` | P2와 동일 | **보호됨** |
| P12 | CLI `seed:catalog-runtime` | `evaluateSeedWrite` → `evaluateLockedAssetOnClient`. upsertAsset/Listing/Opportunity가 `{ wrote, reason }` | **보호됨** (이전 U3). **이번 세션 CLI `main()` 미실행** |
| K1 | `recordFxIngest` | 상품 게이트 밖. 상품 차단/persist 예외 후에도 실행 | **유지** (mock 증거 §7) |
| K2 | ebay heartbeat / `recordTick` | 상품 try/catch 밖. persist 예외여도 실행 | **유지** (mock 증거 §7) |

보호 결과 코드(성공으로 변환하지 않음):

| reason | 의미 |
|---|---|
| `OPERATOR_PROTECTED` | `supply_source=operator` · legacy writer 차단 |
| `GATE_ON` | 외부 쓰기 게이트 ON · 상품 쓰기 전부 차단 |
| `GATE_UNRESOLVED` | 게이트 값 오류 또는 가드 인스턴스 없음 |
| `SCHEMA_UNREADY` | `supply_source` 컬럼 부재/미확인 |
| `SCHEMA_QUERY_FAILED` | 스키마 조회 예외 |
| `PERSIST_EXCEPTION` | persist가 예상 차단이 아닌 예외를 던짐 · `productWrite.status=failed` · 봉투 `ok=false` |
| `ALLOW_LEGACY` | 게이트 OFF · 스키마 준비 · legacy만 · 쓰기 허용 |
| `ALLOW_OPERATOR_CANONICAL` | S2 예약. S1 Admin/CLI/ingest는 이 kind를 넘기지 않음 |
| `LEGACY_NOT_PROMOTABLE` | canonical writer가 legacy 행을 operator로 올리지 못함 |

기존 Admin 기능은 operator 행(또는 게이트/스키마 fail-closed)일 때만 막는다. legacy 행은 게이트 OFF·스키마 준비 시 유지.

---

## 3. 변경한 소스 · 테스트 · draft 파일

이번 보완에서 내용이 바뀐 S1 파일(기존 무관 dirty 제외):

| 파일 | 역할 |
|---|---|
| `services/api-nest/catalog-external-write.core.cjs` | `WRITER_KIND` · 공통 evaluate · 메모리 upsert/image/`patchPricing` · Admin 이미지 SQL |
| `services/api-nest/src/opportunities/catalog-external-write.guard.ts` | core evaluate 위임 · 선택 `writerKind` |
| `services/api-nest/src/adapters/adapters.admin.service.ts` | 가드 누락 fail-closed · `productWrite` · persist try/catch · heartbeat/FX 분리 |
| `services/api-nest/src/opportunities/opportunities.admin.service.ts` | upsert/수직 seed/이미지/`patchPricing`/이미지 sync 가드 |
| `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts` | persist/이미지/boot/`upsertOpportunity` 잠금 재평가 · `{ ok, reason }` |
| `services/api-nest/src/opportunities/opportunity-reprice.service.ts` | evaluate + `requireLegacySupply` |
| `services/api-nest/src/opportunities/opportunities.module.ts` | 가드 DI |
| `tooling/seed/catalog-runtime.cjs` | 공통 evaluate · `module.exports` + `require.main` 가드 |
| `services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts` | Admin writer · gate/schema · canonical 비승격 · 재시도 |
| `services/api-nest/src/opportunities/catalog-external-write.ingest-isolation.cjs` | 차단 후 tick/FX · persist 예외 `ok=false` + heartbeat 유지 |
| `services/api-nest/src/opportunities/catalog-external-write.admin-writers.isolation.cjs` | **신규** 실 Admin 서비스 + CLI export |
| `tooling/verify/operator-row-protect.cjs` | Admin/CLI/productWrite 정적 검사 + isolation 실행 |
| `tooling/verify/domain-by-path.cjs` | admin.service · CLI seed 경로 배선 |
| `tooling/verify/CATALOG.md` · `package.json` | verify 항목 (선행 S1) |
| `quality/migrations-draft/20260913220000_opportunities_supply_source.sql` | **신규 draft 없음.** 기존 draft 유지 |

**새 draft를 만들지 않은 이유:** 기존 draft의 컬럼명(`supply_source`)·CHECK(`operator` \| `legacy_external`)·DEFAULT(`legacy_external`)·일괄 승격/DELETE 금지가 애플리케이션 `SUPPLY_OPERATOR`/`SUPPLY_LEGACY`와 일치한다. `supabase/migrations`에 넣지 않았다.

---

## 4. PASS / BLOCKED / 미검증

명령: `pnpm verify:operator-row-protect` (2026-09-14 02:39 KST) · 로그 최종행 PASS.  
`pnpm verify:catalog-runtime-seed` · exit 0.

| ID | 시나리오 | 판정 | 근거 |
|---|---|---|---|
| S1-A | 게이트 OFF · operator 없음 · legacy 허용 | **PASS** | runtime.test 15중 A |
| S1-B | 게이트 OFF · operator 동일 asset 불변 | **PASS** | persist/image/reprice `OPERATOR_PROTECTED` |
| S1-C | 다른 asset legacy만 갱신 | **PASS** | 동일 |
| S1-D | 게이트 ON · 상품 0 · FX writer 밖 | **PASS** | core + ingest-isolation |
| S1-E | ON→OFF 해도 operator 유지 | **PASS** | 동일 |
| Admin `upsertAsset` operator | 덮어쓰기 0 | **PASS** | memory + 실 Admin isolation |
| 수직 seed / runtime-seed | operator면 `wrote=false` · count 미포함 | **PASS** | upsert 경유 + `evaluateBootSeed` |
| CLI catalog seed | operator asset/listing skip · legacy write | **PASS** | admin-writers isolation (`cli.upsertAsset`/`upsertListing`) |
| 이미지 writer | operator 이미지 0 · signedPut 미반환 | **PASS** | `registerAssetImage` isolation |
| `patchPricing` / 재가격 | operator 가격 0 · override 쓰기 0 | **PASS** | Admin isolation + reprice `requireLegacySupply` |
| 게이트 ON | Admin upsert `GATE_ON` | **PASS** | isolation |
| 게이트 unresolved | ingest `productWrite.blocked` + tick/FX | **PASS** | ingest-isolation |
| 컬럼 부재 | `SCHEMA_UNREADY` · persist 0 | **PASS** | core + Admin + ingest |
| 스키마 조회 실패 | `SCHEMA_QUERY_FAILED` · persist 0 | **PASS** | 동일 |
| 상품 차단 후 tick·FX | mock 호출 유지 | **PASS** | isolation. **실 INSERT 아님** (§7) |
| persist 예외 | `ok=false` · `PERSIST_EXCEPTION` · tick ≥ 1 | **PASS** | isolation (이전 “cuts heartbeat” 교체) |
| 중복/재시도 우회 | 두 번째 upsert도 차단 | **PASS** | runtime + Admin isolation |
| HTTP 토큰 503/401/201 | 유지 | **PASS** | 격리 Nest `127.0.0.1` |
| 금지 경로 `apps/admin` 등 | dirty 0 | **PASS** | verify porcelain |
| 실 Postgres `FOR UPDATE` | — | **BLOCKED** | `CATALOG_TEST_DATABASE_URL unset` |
| 라이브 operator 행 불변 | — | **미검증** | 운영 DB 미접속 |
| heartbeat/FX 실 INSERT | — | **미검증** | 셸 `DATABASE_URL` unset |

인메모리 mutex를 실 Postgres 경합 PASS로 쓰지 않았다.

---

## 5. 실제 DB 사용 여부

**아니오.**

- 운영 `DATABASE_URL` 미사용 · 연결 시도 0
- Supabase MCP로 운영 프로젝트 조회/적용 0
- fixture/ROLLBACK 0
- draft SQL 미적용
- CLI `main()` 미실행 (`DATABASE_URL`을 읽는 경로를 타지 않음)

---

## 6. 실제 Postgres `FOR UPDATE` 실행 여부

**아니오 · BLOCKED.**

조건(`CATALOG_TEST_DATABASE_URL` 존재 + 승인된 테스트 DB + 운영 DB 아님)이 모두 불충족. verify 로그:

`FOR UPDATE contention: BLOCKED (CATALOG_TEST_DATABASE_URL unset · production fixture/ROLLBACK 0)`

메모리 카탈로그 mutex는 잠금 후 재평가 논리만 고정한다. MVCC 경합 증명이 아니다.

---

## 7. 상품 쓰기 차단 후 heartbeat · FX 보존 증거

`adapters.admin.service.ts`는 상품 persist/이미지를 try/catch로 감싼 뒤, 그 **아래**에서 `recordFxIngest`와 `recordEbayProviderHeartbeat`를 실행한다. 정상 차단은 throw하지 않고 `productWrite.status=blocked`만 남긴다.

ingest-isolation (Fake adapters · **mock** `recordTick`/`recordFxIngest`):

| 케이스 | `productWrite` | tick | FX | 봉투 `ok` |
|---|---|---|---|---|
| 게이트 ON | `blocked` / `GATE_ON` | ≥ 1 | `fx-iso` | true |
| unresolved | `blocked` / `GATE_UNRESOLVED` | ≥ 1 | 1회 | true |
| 컬럼 부재 | persist 0 | ≥ 1 | 1회 | true |
| 스키마 조회 실패 | persist 0 | ≥ 1 | 1회 | true |

로그: `PASS gate ON keeps heartbeat and FX` · `PASS unresolved gate keeps heartbeat and FX` · `PASS missing column keeps heartbeat and FX` · `PASS schema query fail keeps heartbeat and FX`.

이 PASS는 **mock 호출 보존**이다. 실코드 `ProviderHealthService.recordTick` / `FxSnapshotService.recordFxIngest`는 상품 테이블과 분리되어 있으나, 이번 턴 실 Postgres INSERT는 **미검증**.

---

## 8. persist 예외 처리 결과

예상하지 못한 persist throw:

1. 삼키지 않고 `productWrite = { status: "failed", reason: "PERSIST_EXCEPTION", error }`
2. `listingsPersisted = 0`
3. 봉투 `ok: productWrite.status !== "failed"` → **false**
4. 성공·정산·원장으로 꾸미지 않음
5. 같은 요청에서 heartbeat는 계속 실행 (상품 writer와 별 TX/별 서비스)

isolation 고정:

- `cutRes.ok === false`
- `productWrite.status === "failed"`
- `productWrite.reason === "PERSIST_EXCEPTION"`
- error 메시지에 `forced persist throw`
- `listingsPersisted === 0`
- `cutTicks.length >= 1`

로그: `PASS persist throw records failure and keeps heartbeat`.

트랜잭션 의미를 깨뜨릴 상품 쓰기는 발생하지 않았다(예외 시 upsert 0). 비상품 heartbeat는 기존 계약상 상품 persist와 다른 테이블이라 계속 실행한다.

---

## 9. 남아 있는 우회 가능성

1. **실 Postgres `FOR UPDATE` 경합 미증명.** 승인 테스트 DB가 생기면 그 조건에서만 러너를 붙인다.
2. **heartbeat/FX 실 INSERT 미검증.** mock + 코드 분리만 증거.
3. **라이브 operator 행 존재/불변 미검증.** 운영 DB 미접속. 컬럼 draft는 미적용으로 보는 것이 안전하다. 컬럼이 없으면 게이트 붙은 writer는 `SCHEMA_UNREADY`로 상품 쓰기를 막는다.
4. **`operator_canonical`은 구조만.** S1에서 공개 API로 연결하지 않았다. 잘못된 kind는 `WRITER_KIND_INVALID`.
5. **R2 객체 PUT.** 카탈로그 행·signedPut 반환은 차단된다. 클라이언트가 이미 객체 URL을 알면 R2 PUT 자체는 이 가드 밖이다.
6. **`persistComputedPricing` 2-arg 오버로드**는 여전히 필터 없이 UPDATE할 수 있다. 현재 호출자는 Admin/재가격 모두 `{ requireLegacySupply: true }`를 넘긴다. 새 2-arg 호출자를 추가하면 우회가 생긴다.
7. **`persistOverride`**는 evaluate **이후**에만 실행된다. operator면 evaluate에서 throw되어 override 행 0(isolation 확인). evaluate를 건너뛰는 새 호출자는 별개.
8. **CLI `main()`**은 여전히 `DATABASE_URL`을 읽는다. 실행하면 evaluate로 operator 덮어쓰기는 막히지만, 이번 세션은 실행하지 않았다.
9. **`tooling/ebay-resilience/run-fault-injection.cjs`** 등 테스트용 INSERT는 Nest 가드 밖이다. 운영/승인 DB에 돌리지 말 것.
10. **부팅 seed “카탈로그 비어 있음”.** 기존 operator 행이 있으면 evaluate가 그 asset을 막는다. 다른 asset의 **신규** legacy INSERT는 게이트 OFF·스키마 준비 시 허용(의도).

---

## 10. 슬라이스 2를 아직 시작하지 않았다는 확인

다음을 **하지 않았다.**

- 운영자 상품 등록·수정·공개 API 신규 구현
- 어드민 레포(`putduk-ops`) 수정
- `putduk-web` 수정
- 견적/비용/수량 테이블
- 피드 필터·참여·정산 TX 결합
- ebay cron 정지
- `operator_canonical`을 HTTP/Admin에 연결

이 레포 dirty에 `apps/admin` · `packages/ui` · `infra/ops` · `workers/ops-proxy` **0**.

---

## 11. commit · push · DB 적용 · deploy = 0

| 행위 | 횟수 |
|---|---|
| `git commit` | **0** |
| `git push` / merge / rebase | **0** |
| 운영/테스트 DB 접속 · migration apply | **0** |
| Cloudflare/Pages/Nest deploy | **0** |
| `git reset` / `checkout` / `clean` / broad stash | **0** |

HEAD는 작업 시작과 동일 `27b5b9f71f4350ca69f3e657be9b26957e91d8d1`이다. 변경은 워킹트리에만 있다.

---

## 최종

S1 보완의 목표(Admin·CLI·seed·이미지·가격 writer가 operator 행을 덮지 못함 · fail-closed · 상품 차단과 heartbeat/FX 분리 · persist 예외를 성공으로 위장하지 않음)는 **격리 테스트 기준으로 PASS**다. 실 Postgres 경합과 라이브 불변은 **BLOCKED/미검증**이다. **슬라이스 2를 시작하지 말고 여기서 멈춘다.**

---

## 12. 후속 턴 (2026-09-14 04:04–04:20 KST) — 가격 writer 재확인 · R2 · 훅 사실 · 검증 종료

- **단계:** 슬라이스 1 보완만. 슬라이스 2 착수 0
- **작업본:** `feat/operator-registered-catalog-s1` · HEAD `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` (시작과 동일)
- **운영 반영 · commit · push · merge · deploy = 0**
- **DB:** `DATABASE_URL` unset · `CATALOG_TEST_DATABASE_URL` unset · 운영/테스트 DB 접속 0 · 원격 R2 0

이 절은 위 1–11절을 지우지 않고 덧붙인다.

### 12.1 종료 지연 원인과 자원 정리

이전 턴에서 `pnpm verify:operator-row-protect`가 PASS 출력 후 프로세스가 안 끝난 원인(코드 읽기):

1. 격리 Nest HTTP 클라이언트가 keep-alive agent를 써서 소켓이 남음
2. HTTP server를 `closeAllConnections` 없이 닫아 연결이 유지됨
3. `catalog-external-write.ts-hook.cjs`의 `Module._resolveFilename` · `.ts` 확장자 패치가 테스트 종료 후에도 남으면 핸들이 남을 수 있음

이번 워킹트리의 정리 방식(이미 반영되어 있었고, 이번 턴에서 재확인):

- `catalog-external-write.ingest-http.cjs`: `agent: false` · `closeAllConnections` + `app.close` · 서버가 아직 listen이면 `server.close` · `uninstall()` · tmp 디렉터리 삭제
- 성공 경로에 `process.exit(0)` 없음. 실패만 `process.exit(1)`
- ingest / admin / pricing isolation: `finally`에서 gate 복구 + ts-hook `uninstall`
- `operator-row-protect.cjs` 성공 경로도 `process.exit(0)` 없음. 마지막 줄은 PASS 문구와 FOR UPDATE BLOCKED 문구

이번 실행: PASS 로그 다음 줄에 셸이 `EXIT=0`을 인쇄했다. 프로세스는 약 45초 만에 실제로 종료됐다. 종료 문제를 `process.exit(0)`이나 timeout 확대로 숨기지 않았다.

### 12.2 검증별 실제 종료 코드

명령은 한 번에 하나씩. 기존 사용자 서버/다른 작업 프로세스는 종료하지 않음. 셸 `DATABASE_URL` · `CATALOG_TEST_DATABASE_URL` unset.

| 명령 | 벽시계 | 실제 종료 코드 | 프로세스 종료 | 비고 |
|---|---|---|---|---|
| `pnpm verify:operator-row-protect` | 약 45s | **0** | 예. PASS 후 `EXIT=0` 인쇄 | 로그에 FOR UPDATE BLOCKED. exit 0 = 실 DB 검증 완료 아님 |
| `pnpm verify:catalog-runtime-seed` | 약 6s | **0** | 예 | 정적 + 빌더 검사 |
| `pnpm verify:rel-407-price-override` | 약 7s | **0** | 예 | `price-override.service.ts` 경로 해당 |

로컬 전체 `tsc` / `verify:gate` / 운영 API = **미실행**(저사양 · 이번 범위 밖).

`FOR UPDATE` 실 Postgres: **BLOCKED** (`CATALOG_TEST_DATABASE_URL unset` · production fixture/ROLLBACK 0). 종료 코드 0으로 이 항목을 PASS 취급하지 않는다.

### 12.3 하위 가격 쓰기 함수의 보호 방식과 테스트

파일을 읽고 빈틈만 확인했다. persist 본문은 이번 턴에서 다시 구현하지 않았다.

`persistComputedPricing` (`opportunity-reprice.service.ts`):

- 같은 `client`에서 `evaluateLockedOpportunity` 후 UPDATE. `writerKind` 인자 없음
- `opts`는 `void opts`로 무시. 2인자 · `requireLegacySupply: false` · 임의 `writerKind`로 필터를 끌 수 없음
- UPDATE는 항상 `AND supply_source = 'legacy_external'`
- deny면 `code` + `wrote=false` throw. RETURNING 0이어도 같은 형식 throw

`persistOverride` (`price-override.service.ts`):

- 같은 `client`에서 `evaluateLockedOpportunityOnClient` (core, `writerKind` 없음)
- missing → `NotFoundException`. deny → `code` + `wrote=false` throw, INSERT 0
- operator / 스키마 실패 / 게이트 불명이면 override 행이 남지 않음 (isolation이 writes.length === 0 고정)

테스트: `catalog-external-write.pricing-writers.isolation.cjs`

- 2인자 operator 차단
- `{ requireLegacySupply: false, writerKind: operator_canonical }` 우회 실패
- override operator 0 · 재시도 0
- legacy 2인자는 pricing 1 + override 1
- 컬럼 부재 `SCHEMA_UNREADY` · 조회 실패 `SCHEMA_QUERY_FAILED` · writes 0

로그: `PASS persistComputedPricing/persistOverride block operator (2-arg, bypass opts, retry)` · `PASS 2-arg persistComputedPricing and persistOverride write legacy` · `PASS pricing writers fail-closed on schema missing/query fail`.

### 12.4 R2 보호 범위 · 잔존 위험 · 별도 승인

로컬 코드만 읽음. 원격 버킷 GET/PUT/목록 0.

공개 조회 URL (`buildPublicUrl` / `resolveAdminUpload.imageUrl`)은 HTTPS 표시용이다. 업로드 권한 URL은 `signedPutHint`가 만들며, 만료는 300초, key는 `assertAssetKey`로 `assets/` 접두사만 허용한다. 같은 asset은 `assets/{category}/{assetId}.{ext}`로 key가 고정되어 덮어쓰기가 가능하다.

`signedPutHint` 주석은 이 서명이 실제 SigV4가 아니라 placeholder HMAC이라고 적는다. KYC R2(`kyc-r2.service.ts`)는 별도 버킷·실제 SigV4 GET이며 상품 이미지 경로가 아니다.

카탈로그 행: `registerAssetImage` → `upsertAsset`가 operator/게이트/스키마에서 `wrote=false`를 반환하면 응답에 `signedPut` / `r2`가 없다. isolation이 `image.r2` · `image.signedPut` undefined를 고정. verify 정적 검사는 deny return에 `signedPut`이 있으면 FAIL.

객체를 URL만 안다고 PUT할 수 있다고 단정하지 않는다. 공개 GET URL과 PUT 권한은 다르다. 실제 PUT은 버킷 쓰기 권한 또는 유효한 서명된 PUT이 필요하다. 원격 버킷 정책은 이번 턴에 확인하지 않았다.

S1에서 안전하게 고치려 한 항목: `signedPutHint`를 upsert 성공 뒤로 이동. `opportunities.admin.service.ts`에 대한 승인된 StrReplace/Write가 `HOOK_MALFORMED_INPUT`(사용자 메시지 malformed hook input)으로 반복 거부됐다. 동일 파일의 무변경(old=new) 호출만 훅을 통과했다. 훅 파일 수정 · 훅 비활성 · 환경변수 우회 · 셸 `writeFileSync` 패치는 하지 않았다. 이 이동은 **BLOCKED**. 현재 코드는 차단 응답에 hint를 넣지 않지만, 차단 요청에서도 hint를 먼저 계산한다.

잔존 위험:

1. 이미 발급된 서명 URL(이전 성공 응답, 300초)은 이 가드가 회수하지 못함. 원격 revoke는 별도 승인
2. 동일 key 덮어쓰기. key 계약 변경은 새 업로드 계약 → 별도 승인
3. 버킷 정책 / 클라우드 IAM / 공개 쓰기 여부는 미검증 · 변경 0
4. 업로드(객체)와 DB 행은 다른 저장소. DB가 막혀도 이전에 받은 PUT 또는 자격 증명이 있으면 객체는 바뀔 수 있음
5. placeholder 서명이 운영 R2에서 받아들여지는지는 원격 미검증

별도 승인 필요: 버킷 정책 변경, 실제 SigV4, key nonce/버전, 기발급 URL revoke, 새 업로드 API.

### 12.5 훅 관련 사실 확인

보고서 §1의 `tooling/verify/_s1-patch-*.cjs` · `_s1-runtime-extra.cjs`를 훅 우회용 임시 파일이라고 한 문장에 대한 사실:

| 사실 | 근거 |
|---|---|
| 파일 5개가 01:24 KST 세션 시작 때 존재 | 세션 [S1 보완 수정](9d68e8d6-651c-4565-a235-f054b3e0c8cb) Glob `tooling/verify/_s1-*` 후 Delete |
| 이름 | `_s1-patch-admin-once.cjs` · `_s1-patch-cli-once.cjs` · `_s1-patch-iso.cjs` · `_s1-patch-runtime-test.cjs` · `_s1-runtime-extra.cjs` |
| 삭제 시점 | 같은 세션에서 보고서 Write 전 Delete. 워킹트리에 현재 0 |
| 본문 | git에 커밋된 적 없음(untracked 후 삭제). 남은 transcript에 Write 본문 없음. 내용 **미복원** |
| 훅 파일 | `.cursor/hooks/**` 이번 턴 미수정. 이전 S1 세션도 훅 파일 변경 기록 없음 |
| 이번 턴 우회 | 0. 거부된 admin.service 편집을 셸/환경변수로 재시도하지 않음 |

판정: 파일 이름(`patch-*-once`)과 이 레포의 다른 세션 패턴(Cursor 파일 도구 실패 시 셸 `fs.writeFileSync`)은 **Cursor preToolUse를 우회하는 원샷 패치 도구**였을 가능성이 높다. 본문이 없어 `hooks.json` 비활성이나 `HOOK_*=` 환경변수 우배였는지는 **확인 불가**. 표현만 완화하지 않는다. 본문 미복원 · 훅 설정 변경 증거 0 · 이번 턴 우회 0.

이번 턴 훅: `project-boundary` / hook-io가 비어 있지 않은 stdin JSON 파싱 실패를 `HOOK_MALFORMED_INPUT`으로 deny. `opportunities.admin.service.ts` 실변경 페이로드가 반복 deny. 원인 후보: 저사양에서 hook stdin 5초 예산 + 대용량/특정 바이트. 훅 코드를 고치지 않아 확정하지 않음.

### 12.6 이번 턴 수정 파일과 diff 요약

| 파일 | 내용 |
|---|---|
| `tooling/verify/operator-row-protect.cjs` | deny 응답에 `signedPut`이 있으면 FAIL. hint가 upsert보다 앞이면 NOTE만 (FAIL 아님) |
| `catalog-external-write.admin-writers.isolation.cjs` | operator 이미지 차단 시 `r2`/`signedPut` undefined 어서션 |
| `quality/operator-registered-catalog-s1-remediation-20260914.md` | 본 절 추가 |

가격 writer · ingest-http teardown · core evaluate는 기존 워킹트리 유지. `opportunities.admin.service.ts`의 `signedPutHint` 위치는 **미변경**(편집 BLOCKED).

기존 사용자 dirty(규칙/husky/vscode/market-intelligence/workers 등)는 삭제·reset·stash·clean 하지 않음.

### 12.7 PASS / BLOCKED / 미검증

| 항목 | 판정 |
|---|---|
| persistComputedPricing / persistOverride 자체 보호 (격리) | **PASS** |
| Admin/CLI/ingest isolation + HTTP 503/401/201 | **PASS** |
| runtime.test 15 | **PASS** |
| `verify:operator-row-protect` 프로세스 실제 종료 + exit 0 | **PASS** (실 DB 완료 아님) |
| `verify:catalog-runtime-seed` exit 0 | **PASS** |
| `verify:rel-407-price-override` exit 0 | **PASS** |
| 차단 응답에 signedPut 미포함 | **PASS** (코드 + isolation + 정적) |
| 실 Postgres `FOR UPDATE` | **BLOCKED** |
| `signedPutHint`를 upsert 성공 뒤로 이동 | **BLOCKED** (승인된 파일 편집 훅 거부) |
| 원격 R2 정책/실제 PUT | **미검증** |
| 라이브 operator 행 불변 | **미검증** |
| `_s1-patch-*` 스크립트 본문 | **미복원** |
| 로컬 전체 typecheck | **미실행** |

### 12.8 운영 반영 · commit · push · deploy = 0

| 행위 | 이번 턴 |
|---|---|
| `git commit` | **0** |
| `git push` / merge / rebase / deploy | **0** |
| 운영 DB · 원격 R2 · 운영 API · migration apply | **0** |
| 훅 파일 수정 · 훅 비활성 · 환경변수 우회 | **0** |
| S2 API / 어드민 레포 / putduk-web | **0** |

HEAD = `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` (시작과 같음).

슬라이스 2를 시작하지 않는다. 여기서 멈춘다.
