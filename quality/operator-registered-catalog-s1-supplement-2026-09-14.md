# S1 보완 조사 — 외부 상품 경로 전수 · 격리 재확인

- **단계:** 조사·증거 정리만. 슬라이스 2 구현 0 · 운영 DB 0 · 마이그레이션 적용 0 · commit/push 0
- **작성:** 2026-09-14 01:05–01:20 KST
- **작업본:** 로컬 `feat/operator-registered-catalog-s1` · HEAD `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` = `origin/main` = 로컬 `main`
- **이번 턴 코드 변경:** 본 보고서만 추가. 기존 dirty 보존. 애플리케이션·테스트·마이그레이션 초안 미수정
- **접속 금지 준수:** `DATABASE_URL` · 운영 Supabase MCP · 라이브 `api.hiptk.app` **0**. 셸에서 `DATABASE_URL` unset · `CATALOG_TEST_DATABASE_URL` unset 만 확인(값 미출력)

이 문서는 `quality/operator-registered-catalog-investigation-2026-09-13.md` · `quality/operator-registered-catalog-revision-plan-2026-09-13.md` 를 대체하지 않는다. S1 격리 재확인과 외부 상품 경로 전수다.

---

## 0. branch / HEAD / dirty

| 항목 | 값 |
|---|---|
| 현재 브랜치 | `feat/operator-registered-catalog-s1` |
| HEAD | `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` |
| `origin/main` | 동일 SHA |
| 브랜치 고유 커밋 | **0** (main과 같은 HEAD. S1은 워킹트리에만 있음) |
| dirty | 다수. S1 구현 + 기존 CRLF/규칙/프롬프트 dirty가 섞여 있음 |

### S1 관련 dirty (내용 변경)

| 경로 | 상태 |
|---|---|
| `services/api-nest/catalog-external-write.core.cjs` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.guard.ts` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.ingest-*.cjs/.ts` | untracked |
| `services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts` | untracked |
| `tooling/verify/operator-row-protect.cjs` | untracked |
| `tooling/verify/catalog-external-write-ingest-http.cjs` | untracked |
| `quality/migrations-draft/20260913220000_opportunities_supply_source.sql` | untracked |
| `services/api-nest/src/adapters/adapters.admin.service.ts` | modified (+가드 preflight) |
| `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts` | modified (잠금 후 persist/이미지) |
| `services/api-nest/src/opportunities/opportunity-reprice.service.ts` | modified (`requireLegacySupply`) |
| `services/api-nest/src/opportunities/opportunities.module.ts` | modified (가드 DI) |
| `package.json` · `tooling/verify/CATALOG.md` · `domain-by-path.cjs` | modified (verify 배선) |

### 기존 dirty (이번 조사에서 열지 않음 · 삭제/reset 금지)

규칙/husky/vscode/verify 다수 · `services/market-intelligence` · workers wrangler · untracked 프롬프트·교차검증 MD. 실질 내용인지 CRLF인지는 이번 턴에서 재분류하지 않았다.

---

## 1. 이번 턴에서 한 일 / 하지 않은 일

한 일: git 상태 확인. Nest/워커/시드/Admin 상품 writer 전수 읽기. `pnpm verify:operator-row-protect` 재실행. mock vs 실 INSERT 구분. 우회 경로 표. 본 보고서.

하지 않은 일: 슬라이스 2 API, 외부 상품 전면 전환, 운영/테스트 Postgres 접속, fixture/ROLLBACK, 마이그레이션 적용, dirty reset, 테스트 삭제·완화, commit/push/merge/deploy.

---

## 2. 격리 검증 재확인 (2026-09-14 01:14 KST)

명령: `pnpm verify:operator-row-protect` · exit 0.

이 프로세스의 `DATABASE_URL` / `CATALOG_TEST_DATABASE_URL` / `ADAPTER_INGEST_TOKEN` 은 **unset**. 운영 URL을 읽지 않았다.

| ID | 시나리오 | 판정 | 근거 |
|---|---|---|---|
| S1-A | 게이트 OFF · operator 없음 · legacy 허용 | **PASS** | `catalog-external-write.runtime.test.ts` · 인메모리 카탈로그 |
| S1-B | 게이트 OFF · operator 동일 asset 불변 | **PASS** | persist/image/reprice `wrote=false` · `OPERATOR_PROTECTED` |
| S1-C | 다른 asset legacy만 갱신 | **PASS** | 동일 테스트 |
| S1-D | 게이트 ON · 상품 0 · FX는 writer 밖 | **PASS** | core 결정 + ingest-isolation |
| S1-E | ON→OFF 해도 operator 유지 | **PASS** | 동일 테스트 |
| 게이트 값 오류 | `maybe` → `GATE_UNRESOLVED` · persist 0 | **PASS** | core + isolation |
| 컬럼 부재 | `SCHEMA_UNREADY` · listings/assets/opp UPDATE 0 | **PASS** | FakeCatalogDb `missing` |
| 스키마 조회 실패 | `SCHEMA_QUERY_FAILED` · persist 0 | **PASS** | FakeCatalogDb `query_fail` |
| FX·heartbeat 보존 | 게이트 ON / unresolved / 컬럼 부재 / 조회 실패 후에도 tick·FX 호출 | **PASS** | isolation. **호출체는 mock** (§4) |
| persist 예외 컷오프 | persist throw → heartbeat 0 | **PASS** (회귀 고정) | `PASS persist throw cuts heartbeat` |
| HTTP unset | 503 · `ADAPTER_INGEST_TOKEN_NOT_CONFIGURED` · ingest 0회 | **PASS** | 격리 Nest `127.0.0.1` |
| HTTP 헤더 없음 | 401 | **PASS** | 동일 |
| HTTP 잘못된 토큰 | 401 | **PASS** | 동일 |
| HTTP 올바른 토큰 | **201** · ingest 1회 | **PASS** | `status=201 calls=1`. 러너는 2xx 허용. 실제 코드는 Nest POST 기본 201 |
| S1-F 토큰 fail-open | `if (token) {` 패턴 없음 | **PASS** | static 검사 |
| S1-G 금지 경로 | dirty에 `apps/admin` 등 0 | **PASS** | verify porcelain 검사 |
| 실 Postgres `FOR UPDATE` 경합 | — | **BLOCKED** | `CATALOG_TEST_DATABASE_URL unset` · 운영 fixture/ROLLBACK 0 |
| 라이브 운영자 행 존재 | — | **미검증** | 운영 DB 미접속. 2026-09-13 조사 당시 `supply_source` 컬럼 없음 → 당시 operator 행 0으로 인용만 |
| 라이브 늦은 ebay 틱 | — | **미검증** | 운영 API 미호출 |

`catalog-external-write.ingest-http.selftest.ts` 는 존재만 검사한다. 실행 러너는 `catalog-external-write.ingest-http.cjs` 다. `.ts` 파일은 올바른 토큰을 200으로 적어 두었으나, 이번 실행의 실제 응답은 **201** 이다. 조건을 바꾸지 않았다.

---

## 3. `recordTick` · `recordFxIngest` — mock vs 실 INSERT

| 위치 | 종류 | 하는 일 |
|---|---|---|
| `catalog-external-write.ingest-isolation.cjs` `makeAdapters` | **mock** | `recordTick` → 배열 `push`. `recordFxIngest` → `{ snapshotId: "fx-iso" }`. SQL 0 |
| `catalog-external-write.ingest-http.cjs` | **mock** | ingest 서비스 전체가 `{ ok: true }`. persist/FX/heartbeat 미실행 |
| `ProviderHealthService.recordTick` ( Nest 실코드) | **실 INSERT** (`db.configured()`일 때) | `provider_tick_ledger` INSERT ON CONFLICT DO NOTHING · 클레임 성공 시 `provider_runtime_health` UPSERT. 상품 테이블 0 |
| `FxSnapshotService.recordFxIngest` (Nest 실코드) | **실 INSERT** (`db.configured()`일 때) | `fx_snapshots` INSERT ON CONFLICT DO NOTHING. 상품 테이블 0 |

이번 재확인의 heartbeat·FX **PASS는 mock 호출 보존**이다. 실제 Postgres INSERT가 게이트 ON에서도 성공하는지는 **미검증**. 실코드 분기는 상품 writer와 분리되어 있다.

셸 `DATABASE_URL` unset 이면 실코드 `recordTick`/`recordFxIngest` 는 각각 unknown snapshot / `DATABASE_URL_UNSET` 으로 빠지고 INSERT 하지 않는다.

---

## 4. 실제 DB 사용 여부 · Postgres 경합

| 질문 | 답 |
|---|---|
| 이번 턴 실제 DB? | **아니오** |
| 승인된 테스트 Postgres? | **없음** (`CATALOG_TEST_DATABASE_URL` unset) |
| 운영 `DATABASE_URL` 사용? | **아니오** (셸 unset · 연결 시도 0) |
| 메모리 `FOR UPDATE` 흉내? | **있음** (`createMemoryCatalog` mutex). 실 MVCC 아님 |
| 실 Postgres 경합 가능? | **아니오 · BLOCKED** |

`supabase/migrations` 에 `20260913220000_opportunities_supply_source.sql` **없음**. 초안만 `quality/migrations-draft/`. 운영 컬럼 적용 여부는 이번 턴 미조회. 가드 계약은 컬럼 없으면 상품 쓰기 **전부 차단** (`SCHEMA_UNREADY`).

---

## 5. 외부 상품 경로 전수

상품 = `assets` / `listings` / `opportunities` 가격·이미지·버전·상태. FX·heartbeat·원장·입출금은 상품이 아니다.

게이트 = `CATALOG_EXTERNAL_WRITE_GATE` + `CatalogExternalWriteGuard.evaluateLockedAsset` / `evaluateBootSeed` / `preflightProductWrites`.

### 5.1 표

| ID | 경로 | 파일 · 함수 | 상품 R/W | operator 영향 | 게이트 보호 | 우회 | 근거 |
|---|---|---|---|---|---|---|---|
| P1 | eBay cron → Nest ingest | `workers/ebay-adapter/src/index.ts` `scheduled`/`runTick` | 워커 자체 W 0. HTTP POST만 | 간접: Nest persist가 열리면 가능 | 워커에 게이트 없음. Nest persist에 있음 | 늦은 틱은 토큰만 맞으면 Nest에 도착 | cron `*/15` · `NEST_ADAPTER_INGEST_URL` |
| P2 | ingest persist (ebay\|admin) | `adapters.admin.service.ts` `ingest` → `persistIngestListings` → `persistOneListingLocked` | **쓰기** listings | 동일 `asset_id`에 operator가 있으면 persist 0 | **있음** (preflight + TX 잠금 재평가) | 가드 Optional 누락 시 ingest preflight는 fail-open이나, persist는 seed 가드가 다시 막음 | L400–429 · seed L375–386 |
| P3 | ebay 이미지 provenance | `catalog-runtime-seed.service.ts` `applyEbayImageProvenance` | **쓰기** assets + opportunities 이미지 | operator면 차단. 허용 시 opp는 `legacy_external`만 UPDATE | **있음** | Admin `upsertAsset` 는 이 함수를 안 탐 (§5.2) | L206–238 |
| P4 | persist 후 재가격 | `opportunity-reprice.service.ts` `repriceFromCurrentListings` / `repriceOneAsset` | **쓰기** opportunities 가격/버전/`stale_at` | operator면 `evaluateLockedAsset` deny. persist도 `requireLegacySupply` | **있음** | `persistComputedPricing` 2-arg(Admin)는 필터 없음 (§5.2 U2) | L130–245 |
| P5 | Nest 부팅 min seed | `CatalogRuntimeSeedService.onModuleInit` → `ensureMinCatalog` | **쓰기** (카탈로그가 비어 있을 때) | boot는 `sources:[]` 만 본다. 기존 operator 행을 잠그지 않음 | **부분** (`evaluateBootSeed` = 게이트+스키마만) | 카탈로그가 “비어 있음”으로 보이면 수직 시드가 `upsertAsset` 우회로 감 | L48–98 · `decideBootSeed` |
| P6 | Admin runtime-seed HTTP | `POST .../catalog/runtime-seed` | P5와 동일 | 동일 | 부분 | 동일 | `opportunities.admin.controller.ts` L155 |
| P7 | Admin 수직 시드 | `seedTradingCardAssets` / `seedLuxuryBagAssets` / `seedWatchAssets` | **쓰기** assets + opp 이미지 동기화 | **있음** — `upsertAsset` 가 operator opp 이미지를 덮을 수 있음 | **없음** | **우회** | admin.service L406–501 |
| P8 | Admin 에셋 upsert | `upsertAsset` | **쓰기** assets | 동일 `asset_id`면 덮어씀 | **없음** | **우회** | L352–399 |
| P9 | Admin R2 이미지 | `registerAssetImage` → `upsertAsset` | **쓰기** | P8과 동일 | **없음** | **우회** | L659–711 |
| P10 | Admin 가격 패치 | `patchPricing` → `persistComputedPricing` (legacy 조건 **없음**) | **쓰기** opportunities + `opportunity_price_overrides` | **있음** — operator 행 id만 알면 가격/버전 변경 | **없음** | **우회** | admin.service L276–284 · reprice L84–96 |
| P11 | Admin ingest `adapterId=admin` | 동일 `ingest` | P2와 동일 | P2와 동일 | **있음** | P2와 동일 | persist는 ebay\|admin만 |
| P12 | CLI `seed:catalog-runtime` | `tooling/seed/catalog-runtime.cjs` | **쓰기** assets/listings/opportunities/fx | listings UPDATE는 기존 행을 덮음. opp는 없을 때만 INSERT. 게이트 0 | **없음** | **우회** ( Nest 밖 · `DATABASE_URL` 직접) | 이번 턴 **미실행** |
| P13 | Amazon ingest | `workers/amazon-adapter` → Nest `ingest` | 워커 W 0. Nest persist **0** (ebay\|admin만) | 상품 행 0 | persist 미호출 | Day-1 `FORBIDDEN_INGEST_ADAPTERS` 가 `persistIngestListings("amazon")` throw | adapters.admin L407 · seed L264–269 |
| P14 | Yahoo JP ingest | `workers/yahoo-jp-adapter` | P13과 동일 | 0 | persist 미호출 | 동일 | Day-1 auto-publish yahoo = false |
| P15 | Chrono24 | 어댑터 **없음** | — | 0 | 해당 없음 | 코드 경로 0. `forbidden.cjs` / listingLegs `chrono24` FORBIDDEN | `workers/chrono24*` 없음 |
| P16 | Fashionphile | 이 레포 `workers/` **없음** | 과거 `source_observations` only (2026-09-13 조사) | 상품 테이블 쓰기 경로 없음 | 해당 없음 | 이번 턴 워커 재확인: 소스 부재 | 라이브 행수는 미조회 |
| P17 | PokemonTCG / YGO | `workers/pokemontcg-adapter` · `ygoprodeck-adapter` | Nest에 catalog/observations만. listings persist 0 | 상품 W 0 | persist 미호출 | 시드 이미지 URL 출처일 뿐 라이브 덮어쓰기 writer 아님 | ingest body `role=catalog_ref` |
| P18 | identity review | `enqueueIdentityReview` | 메모리만 | 0 | 해당 없음 | DB `identity_review_queue` writer 이번 소스 미발견 | adapters.admin L551 |
| P19 | SourcePolicy | `source-policy.service.ts` | 정책 버전 CRUD | writer가 읽지 않음 | **상품 가드 아님** | 정책 ON이어도 ingest/reprice 미강제 | 기존 조사와 동일 |
| K1 | FX CoinGecko/Frankfurter | `recordFxIngest` | 상품 W 0 · `fx_snapshots` | 0 | 상품 게이트 밖 (의도) | 없음 | ingest L434–440 |
| K2 | ebay heartbeat | `recordEbayProviderHeartbeat` → `recordTick` | 상품 W 0 · ledger/health | 0 | 상품 게이트 밖 | persist **예외** 시 이 줄에 도달 못함 (컷오프) | L445–447 · isolation cut |
| K3 | 유저 피드/참여 | `opportunities.user.service` · `participate` | 기회 **읽기**. 상품 카탈로그 UPDATE 0 | 읽기만 | 해당 없음 | 상품 덮어쓰기 경로 아님 | UPDATE opportunities 0 |
| K4 | 입출금·원장·push | 해당 서비스/워커 | 상품 0 | 0 | 해당 없음 | — | — |

### 5.2 운영자 행을 외부/기존 Admin 경로가 덮을 수 있는가 (코드, 읽기 전용)

**게이트가 붙은 외부 ingest/이미지/재가격:** 컬럼이 있고 `supply_source='operator'` 이면 **같은 asset 전체** persist/이미지/재가격 0. 게이트를 OFF로 되돌려도 operator 보호는 유지. 근거: `decideProductWrite` · `SQL.updateOpportunityImage` · `requireLegacySupply`.

**아직 덮을 수 있는 경로 (S1이 막지 않음):**

| ID | 경로 | 덮는 필드 | 조건 |
|---|---|---|---|
| U1 | `upsertAsset` / 수직 시드 / `registerAssetImage` | `assets.image_*` · `opportunities.asset_image_*` · label/category · 이미지 가드로 `paused` | 게이트·`supply_source` 미참조. `WHERE asset_id = $1` |
| U2 | `patchPricing` | pricing JSON · `pricing_version` · `priced_at`/`stale_at` · 손익 | `persistComputedPricing` 2-arg. `AND supply_source = 'legacy_external'` **없음** |
| U3 | CLI `seed:catalog-runtime` | assets/listings (기존 listings UPDATE) | Nest 가드 밖. 이번 턴 미실행 |
| U4 | `ensureMinCatalog` 가 “비어 있음”일 때 | U1 + listing persist + **신규** opp INSERT | boot는 operator 행을 잠그지 않음. 기존 opp가 있으면 INSERT skip |

라이브에 operator 행이 있는지는 **이번 턴 미검증**. 컬럼 초안은 미적용으로 보는 것이 안전하다. 컬럼이 없으면 게이트 붙은 writer는 `SCHEMA_UNREADY` 로 상품 쓰기를 막는다. **U1–U3는 컬럼이 없어도 그대로 쓴다.**

`AdaptersAdminService.catalogWrite` 가 Optional 이다. 가드가 빠져도 ingest preflight는 `skipAll: false`. 실제 listings 쓰기는 `CatalogRuntimeSeedService` 가드가 막는다. Admin U1/U2는 그 가드를 호출하지 않는다.

---

## 6. 슬라이스 2로 넘어가면 안 되는 이유

1. S1 목적(게이트 OFF여도 operator 가격·이미지·버전은 외부 writer가 못 바꿈)이 **Admin/CLI writer에 대해 미달**이다. 슬라이스 2는 견적 스키마·운영자 등록 API다. 우회가 열린 채 API를 열면 등록 직후 시드/패치/CLI가 덮는다.
2. 실 Postgres `FOR UPDATE` 경합은 **BLOCKED**. 메모리 mutex만으로 잠금 후 재평가를 운영 경합 증명으로 쓰면 안 된다.
3. `supply_source` 는 draft만. 운영 적용·테스트 DB 승인 없음. 슬라이스 2 DDL을 올리면 이력/적용 순서가 다시 꼬인다.
4. persist 예외 시 heartbeat가 끊기는 컷오프는 테스트로 고정만 됨. 고치지 말라는 이번 범위에서 **남은 결함**이다.
5. 브랜치에 S1 커밋이 없다. dirty가 구현+무관 파일과 섞여 있다. 슬라이스 2를 이 worktree에 얹으면 atomic 이 깨진다.
6. 이번 지시가 슬라이스 2 구현을 **금지**한다.

---

## 7. 최종 판정

| 항목 | 판정 |
|---|---|
| 격리 HTTP 토큰 503/401/201 | **PASS** |
| 게이트·컬럼 부재·정책 실패 시 상품 쓰기 차단 | **PASS** (게이트가 붙은 경로만) |
| heartbeat·FX 흐름 보존 (mock) | **PASS** |
| persist throw 컷오프 | **PASS** (회귀 고정) |
| 실 Postgres 경합 | **BLOCKED** |
| 운영자 행 실DB 불변 | **미검증** |
| Admin/CLI 우회 | **잔존** (U1–U4) |
| 이번 턴 코드 변경 | **보고서만** |
| 슬라이스 2 착수 | **불가** |

**최종:** S1 로컬 보호·격리 재확인은 유지된다. 외부 ingest/이미지/재가격은 코드상 operator를 막는다. 운영자 등록 상품을 “외부·기존 Admin 경로가 덮지 못한다”고 닫을 수는 없다. 승인된 테스트 Postgres가 없고 `FOR UPDATE` 는 BLOCKED 다. **슬라이스 2를 시작하지 말고 여기서 멈춘다.**
