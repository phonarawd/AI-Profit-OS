# 운영자 등록 상품 전용 전환 — 조사·변경 계획

- **단계:** 조사 완료 · **구현 미착수** · 승인 전 코드/설정/마이그레이션/운영 DB/배포 변경 0
- **조회 시각:** 2026-09-13 20:22–20:50 KST (11:22–11:50 UTC)
- **대상 커밋:** `27b5b9f71f4350ca69f3e657be9b26957e91d8d1`
- **권위:** 이번 세션의 로컬 작업본 · GitHub `phonarawd/AI-Profit-OS` main · 라이브 `GET /api/v1/health` · Supabase `mgsytcetsiecllmhcyox` 읽기 전용
- **2026-09-13 GPT 스냅샷은 참고만.** 아래 수치는 재조회 결과다.

---

## 1. 기존 작업 상태와 이번 조사에서 변경하지 않은 범위

### 확인된 기존 작업 (보호 · 중단·덮어쓰기 금지)

| 항목 | 상태 | 근거 |
|---|---|---|
| 로컬 브랜치 | `main` · `origin/main` 추적 | `git status -sb` |
| HEAD | `27b5b9f7` | `git rev-parse HEAD` |
| 원격 | `https://github.com/phonarawd/AI-Profit-OS.git` = `phonarawd/AI-Profit-OS` | `git remote -v` · `gh api repos/phonarawd/AI-Profit-OS` |
| 미커밋 | 규칙/verify/워커/market-intelligence 등 `M` 다수 + untracked 프롬프트 2개 | `git status` |
| 내용 diff | 실질 변경은 `.vscode/settings.json` (+6/−2). 나머지 다수는 CRLF 경고 | `git diff --stat` |
| PR #222 | OPEN · `fix/customer-web-contract-p0` · 고객웹 P0 계약 | `gh pr view 222` |
| 릴리스 플랜 | 첫 pending = `rel-701` (Production 앱 배포) | `PUTDUK_RELEASE_MASTER.plan.md` L347–349 |
| 로컬 터미널 | 유휴 PowerShell만 | terminals/1.txt |
| 실행 권위 | Index는 HISTORICAL. 실행 SSOT는 Release Master | Index REL-017 stamp |

이번 조사는 위 파일을 수정·커밋·푸시·브랜치 전환하지 않았다. 애플리케이션 코드, lockfile, CI, 마이그레이션, 운영 DB DML/DDL을 변경하지 않았다.

### 이번 산출물

- 본 보고서만 추가한다. 구현 승인으로 해석하지 않는다.

---

## 2. 로컬 · GitHub · 배포본 · DB 대조표

조회 시각 2026-09-13 11:22–11:50 UTC.

| 축 | 식별자 | 판정 |
|---|---|---|
| 로컬 HEAD | `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` | 작업본 |
| `origin/main` / GitHub main | 동일 SHA · `git ls-remote origin refs/heads/main` | GitHub = 로컬 HEAD |
| 라이브 Nest `https://api.hiptk.app/api/v1/health` | `gitSha=27b5b9f7` · `gitShaSource=RENDER_GIT_COMMIT` · `db.ok` · `redis.ok` | **배포 API = 이 SHA** |
| 라이브 Nest `https://ai-profit-os.onrender.com/api/v1/health` | 동일 SHA | Render origin 확인 |
| Cloudflare Workers | `ebay-adapter` / `ebay-adapter-production` 존재. 코드 수정일 2026-08-25. cron 활성 여부는 워커 설정 미확인 | 배포 워커 ≠ GitHub SHA 가정 금지 |
| 로컬 마이그레이션 파일 | `supabase/migrations` **55개** | `Get-ChildItem` |
| DB 적용 이력 (`list_migrations`) | **68개** | Supabase MCP |
| 프로젝트 | `https://mgsytcetsiecllmhcyox.supabase.co` | `get_project_url` |

**GitHub main을 배포본으로 가정하지 않았다.** 배포 SHA는 헬스의 `RENDER_GIT_COMMIT`으로 확인했다. Render MCP는 workspace 미선택이라 서비스/디플로이 목록은 조회하지 않았다. 이전 잔여 보고(`quality/backend-residual-report.md`)의 Render 서비스 id는 참고이며, 이번 세션에서 재확인하지 않았다.

### 마이그레이션: 개수가 아니라 버전 대조

공식 문서: 원격은 `supabase_migrations.schema_migrations`에 적용분을 기록하고, 로컬 폴더와 별개다. 원격 대시보드 DDL은 이력을 우회한다.  
https://supabase.com/docs/guides/deployment/database-migrations

| 구분 | 내용 |
|---|---|
| 이름 같고 타임스탬프만 다름 | `ptf00c_*` 로컬 `20260814130000`/`130100`/`130200`/`140000` vs 적용 `20260814134038`/`134055`/`135111`/`152139`. **SQL 동일 여부 미확인. 동일 취급 금지.** |
| 로컬에 없고 DB에만 있음 | `20260810212231_idempotency_request_fingerprint` (로컬 `20260811062000`과 이름만 같음) |
| 로컬에 없고 DB에만 있음 (12) | `krw_deposit_bank_snapshot` · `payout_reservation_and_execution_confirm` · `admin_identity_sessions` · `user_matching_policy_b7` · `s3_32_consent_versions` · `s3_34_peotteok_history` · `push_control_subscriptions_rls` · `product_onboarding_progress` · `s3_33_product_pipeline` · `global_source_unlock_observation_sources` · `fashionphile_image_source` · `trial_welcome_grant` |
| 이력 repair | **하지 않음** · 제안하지 않음. `migration repair`는 추적 테이블만 고치고 SQL을 적용/되돌리지 않는다(공식 문서 Caution). |

GPT 스냅샷(main `27b5b9f7` · 파일 55 · DB 68)은 **이번에도 성립**한다. 그 사이 GitHub main 이동은 없다. DB에는 그 스냅샷 이후 **추가 마이그레이션이 더 적용되지 않았다**(여전히 68).

### 이미 DB에만 있는 기능 (중복 개발 금지 · Nest 미배선 구분)

| 객체 | DB | 로컬 main Nest | 행수 |
|---|---|---|---|
| `matching_policy_versions` / `_assignments` / `_group_members` / `_audit` | 있음 · B7 주석 | **참조 0** (`rg matching_policy` services/api-nest) | 0 |
| `trade_execution_confirmations` | 있음 · RLS **OFF** | Nest 참조 0 | 0 |
| `trade_executions.matching_policy_id/version/source` · `required_capital_usdt_snapshot` | 컬럼 있음 | `insertAccepted`가 쓰지 않음 | — |
| `trade_executions.funding_source` · `participate_requests.funding_source` | DEFAULT `'own_principal'` | Nest가 쓰지 않음 | — |
| `trial_grants` / `trial_user_state` / `trial_settlements` / `trial_program_config` | 있음 | `TrialStateService`는 **`practice_grants`만** | grant 1 / state 1 / settlement 1 |
| `opportunities.trial_eligible` | 있음 | 피드/참여 SQL이 읽지 않음 | true 1건 |
| `admin_*` 자격·세션 테이블 | 있음 | 로컬 마이그레이션 없음 | 0 |
| `product_onboarding` | 있음 | 이번 전환 범위 밖 | 0 |
| `payout_reservations` 테이블 | **없음** | 마이그레이션 이름만 존재 | — |

RLS 공식: https://supabase.com/docs/guides/database/postgres/row-level-security  
`trade_execution_confirmations` RLS OFF는 어드바이저 경고. 이번 요청으로 ENABLE하지 않았다.

---

## 3. 확인된 사실 / 미확인 / 설계 제안

### 확인된 사실

1. 사용자 노출 카탈로그는 **eBay 리스팅 수집 + 시드 에셋 + 자동 재가격**이다. `listings` 643건 전부 `ebay_us`(373, 최근 2026-09-13 11:30:11Z) · `ebay_gb`(270, 11:15:11Z).
2. `provider_tick_ledger` ebay 틱이 **오늘 11:15:23Z**까지 기록된다. 소스에 스케줄러가 있다는 사실과 별개로, ** Nest ingest가 현재 틱을 받고 있다.**
3. ingest는 리스팅 upsert 후 `repriceFromCurrentListings`를 호출한다(`catalog-runtime-seed.service.ts` 359–361). `useAdminOverride===true`만 재가격 생략. `opportunity_price_overrides` **0행** → 현재 기회는 덮어쓰기 가능.
4. 기회 115건 중 available 112 · paused 3. `updated_at` 최대 2026-09-13 11:16:17Z.
5. 참여 가드와 실행 정책 모두 **신선도 3초** (`DEFAULT_PRICE_STALE_MAX_SEC=3` · `execution_policies.stale_allowance_sec=3`). `stale_at === priced_at`(as-of). 운영자 유효기간과 외부 시세 freshness가 **분리되어 있지 않다.**
6. 참여는 원장 lock 전표와 trade INSERT가 **다른 트랜잭션**이다(`participate.service.ts` 716 vs 738). 2026-09-13에도 그대로다.
7. 실행 틱은 **현재 기회 행**의 손익·상태를 다시 읽는다. 참여 시점 스냅샷으로 정산하지 않는다(`trades.execution.service.ts` 186–196, 255–314).
8. 원장 버킷 CHECK는 `principal|profit|locked|practice`만. `trial_profit` 없음(`20260808205846_ledger_accounts_journals.sql` 20–23).
9. 인증은 Nest JWT · 쿠키 `aipo_session`(`auth.constants.ts` 14). Supabase는 DB만.
10. Soft60 / Hard90는 서버 거래 기한. 체험사이트는 약 70초 7단계 가상 연출. 둘은 이미 다른 시계다.

### 미확인

- Cloudflare `ebay-adapter` cron이 실제로 enable인지(워커 코드 수정일 ≠ 크론 활성). 틱 증거는 Nest 수신 쪽만 확실.
- Fashionphile 워커가 지금 크론 중인지. `source_observations` 19,338건 전부 `fashionphile`, 최근 2026-09-12 12:14:28Z. 어제 기록 ≠ 오늘 실행.
- `identity_review_queue` 466행의 **현재 라이브 writer**. 로컬 Nest는 메모리 큐. DB writer는 main에서 미발견.
- ptf00c 로컬 SQL과 원격 적용 SQL 바이트 동일 여부.
- `payout_reservation_and_execution_confirm` SQL 원문(파일 없음).
- Render 서비스/디플로이 id(MCP workspace 미선택).
- `phonarawd/putduk-ops` 화면이 실제 Admin API를 치는지. GitHub code search 0건 · 트리 조회 차단. **프로토타입 성공 ≠ 운영 기능.**
- 체험사이트 원본 소스/에셋/라이선스. 공개 HTML만 확인.
- 라이브 `ADAPTER_INGEST_TOKEN` 설정 여부(비밀 미출력). 틱이 들어왔으므로 ingest는 통과 중이다.

### 설계 제안 (미구현)

아래 5절 이후. 새 레포/새 인증/Supabase Auth/전체 워커 중지는 제안하지 않는다.

---

## 4. 외부 상품 공급 · 자동 갱신 경로

환율·입출금·정산·원장·outbox·알림 경로는 **유지**. 상품 쓰기만 차단 대상.

| ID | 경로 | 파일 · 함수 | 호출자 | DB 쓰기 | 실행 확인 |
|---|---|---|---|---|---|
| P1 | eBay Browse cron → Nest ingest | `workers/ebay-adapter/src/index.ts` `scheduled`/`runTick` · cron `*/15` | CF Worker | `POST /api/v1/internal/adapters/ingest` | ** Nest 수신 확인** (틱 11:15Z, 리스팅 11:30Z). 워커 프로세스 자체는 미확인 |
| P2 | ingest persist + 이미지 + heartbeat | `adapters.admin.service.ts` `ingest` 279–464 · `recordEbayProviderHeartbeat` | P1, 수동 `/tick`, 재시도 | `listings` upsert · `assets` 이미지(`applyEbayImageProvenance`) · `provider_tick_ledger` · `provider_runtime_health` | **활성** |
| P3 | persist 후 재가격 | `catalog-runtime-seed.service.ts` `persistIngestListings` 359–361 → `opportunity-reprice.service.ts` `repriceFromCurrentListings` | P2 | `opportunities` pricing/version/`priced_at`/`stale_at` | **활성** (updated_at 11:16Z) |
| P4 | Nest 기동 min catalog seed | `CatalogRuntimeSeedService.onModuleInit` 45–53 | api-nest 부팅 | 비어 있을 때만 assets/listings/opportunities. 현재는 skip 조건 충족 | 소스 존재 · **이번 부팅 실행은 스킵 추정**(available≥1) |
| P5 | Admin vertical seed | `POST .../assets/seed/{trading-card,luxury-bag,watch}` · `catalog/runtime-seed` | 운영자 수동 | assets + ebay-shaped listings | 소스 존재 · 최근 수동 실행 미확인 |
| P6 | Admin 에셋 upsert / R2 이미지 | `upsertAsset` · `registerAssetImage` | 어드민 | `assets` · 기회 이미지 동기화 | API 존재 |
| P7 | Admin 가격 패치 | `patchPricing` 154–307 | 어드민 | `opportunities` + `opportunity_price_overrides` + audit | API 존재 · override 0행 |
| P8 | Fashionphile parser | CF `fashionphile-parser-preview` · main `workers/` 없음 | 별도 워커 | `source_observations` only (확인된 최근 소스) | **어제까지 기록**. 오늘 실행 미확인 |
| P9 | Amazon / Yahoo cron | `workers/amazon-adapter` `*/20` · `yahoo-jp-adapter` `*/20` | 소스 cron | Day-1 persist는 ebay\|admin만 (`ingest` 399) | CF workers 목록에 **없음**. 배포 활성 미확인 |
| P10 | PokemonTCG / YGO | cron `0 */6` 등 | 소스 | 시드 이미지 출처 32+9 | CF 목록 없음. 라이브 수집 미확인 |
| P11 | 메모리 identity queue | `enqueueIdentityReview` | ebay ingest | 프로세스 메모리. 테이블 466행 writer **미확인** | 테이블만 확인 |
| P12 | 대기 재시도 | Worker 재시도 + 동일 `providerTickId` | P1 | `provider_tick_ledger` 클레임으로 중복 카운트 no-op. **리스팅 UPDATE는 재시도해도 발생 가능** | 경쟁 상태 위험 |
| K1 | FX CoinGecko / Frankfurter | `workers/coingecko-adapter` `*/5` · `frankfurter` 매시 · `fxSnapshots.recordFxIngest` | **유지** | `fx_snapshots` | 최근 스냅샷 2026-09-08. **상품과 별개. 끄지 말 것** |
| K2 | chain-watchers / sweeper / push | 해당 workers | **유지** | 입출금·푸시 | 상품 경로 아님 |
| K3 | 원장 outbox · 알림 훅 | `ledger_outbox_events` 9행 | **유지** | outbox | 상품 경로 아님 |

**덮어쓰기 위험:** 전환 중 P1의 늦은 틱이 P2–P3로 운영자 가격/이미지를 덮는다. `useAdminOverride`가 켜진 행만 재가격을 건너뛴다. 이미지 provenance는 override와 무관하게 호출된다(409–420).

---

## 5. 기존 기능 재사용 / 수정 / 추가

| 기능 | 판정 | 근거 |
|---|---|---|
| Nest JWT · `aipo_session` · Admin JWT 분리 | **재사용** | `auth.constants.ts` |
| 원장 복식 · 버킷 4종 · idempotency | **재사용** | ledger 마이그레이션 · `LedgerPostingService` |
| 참여 idempotency + fingerprint | **재사용** | `participate.service.ts` 281–296, 620–671 |
| 멤버십 일일 캡 · 밴드 · 동시 슬롯 | **재사용(슬롯≠재고)** | `assertMembershipGuards` · `daily_opp_slots_default=12` · `daily_user_match_cap=5` |
| user_opportunity_overrides (숨김/강제/핀) | **재사용** | Admin CRUD 존재 · 0행 |
| user_match_policy_overrides | **재사용** | 참여 가드가 읽음 |
| matching_policy_* | **배선 추가** (테이블 재사용, 신규 테이블 금지) | DB만 존재 |
| trade_execution_confirmations | **선택 배선** · 먼저 RLS 정책 설계 | RLS OFF |
| Admin patchPricing · price layers | **수정** | 항목별 원화 비용·표시 채널·유효기간 부족 |
| Admin 상품 **신규 등록/미리보기/공개/일시중지** | **추가** | 컨트롤러에 create/pause/publish 없음 |
| upsertAsset / R2 이미지 | **재사용+수정** | 카테고리·imageSource enum이 운영자 전용에 좁음 |
| 시드·runtime-seed·ebay ingest persist | **수정(차단)** | 자동 공급 종료 |
| 3초 freshness를 운영자 가격에 적용 | **수정(분리)** | 우회용 미래 `stale_at` 금지 |
| 참여 lock vs trade 2트랜잭션 | **수정** | 현재 미해결 |
| 실행 정산이 live opportunity를 읽음 | **수정** | 스냅샷 정산 필요 |
| 체험 vs 본인 자금 | **수정** | Nest는 항상 principal. `trial_*`는 DB만. 클라이언트 선택 금지 |
| 수량(등록 1회 · 다수 이용) | **추가** | 동시 슬롯만 있음. 재고/예약 컬럼 없음 |
| 항목별 비용 · 0원 vs 누락 | **추가** | formula는 ebay 13.5%+리스크버퍼를 항상 합산 |
| 표시 채널 vs 데이터 공급원 | **추가** | pricing enum = `ebay_*|admin` 뿐 |
| 사용자 쉬운 한국어 사유 | **확장** | toastCode만. `reasonKo` 없음 |
| 새 백엔드/DB/Auth/레포 | **금지** | 요청·스택 잠금 |

---

## 6. 파일별 변경 계획과 영향 (승인 후)

구현하지 않음. 영향 범위만.

| 파일 | 계획 | 영향 |
|---|---|---|
| `adapters.admin.service.ts` | 상품 persist/이미지 보강 no-op 게이트. heartbeat·health는 유지 | eBay 틱은 살아 있으나 listings/opp 미갱신 |
| `catalog-runtime-seed.service.ts` | onModuleInit seed 0 · persist 게이트 | 재시작이 카탈로그를 다시 채우지 않음 |
| `opportunity-reprice.service.ts` | 운영자 행·플래그 시 재가격 0 | 늦은 틱 경쟁 완화 |
| `opportunities.admin.controller/.service.ts` | 등록/미리보기/공개/중지/배정 API | 어드민 계약 |
| `participate.service.ts` | 단일 트랜잭션 또는 outbox 보상 · 스냅샷 · 서버 자금출처 · 운영자 유효기간 | 참여 원자성 |
| `trades.execution.service.ts` | 정산은 trade 스냅샷만. live 가격 무시 | 운영자 수정 격리 |
| `opportunities.user.service.ts` | 피드 freshness = 운영자 창 · 응답 필드 확장 | 사용자 웹 |
| `pricing-formula.cjs` 또는 신규 `operator-pricing.cjs` | 항목별 원화 · 기본 ebay 수수료 자동 적용 0 | 중복 차감 방지 |
| `schemas/opportunity-card.v1.json` · `opportunity-pricing.v1.json` | 표시 채널·비용·수량·사유 | 웹 계약 |
| `asset-image-r2.service.ts` | 유지. imageSource 운영자 값 | 사진 |
| `workers/ebay-adapter` cron | 상품 ingest 중단은 **승인된 전환 단계**. 즉시 코드 삭제 금지 | 늦은 쓰기 |
| `workers/coingecko-adapter` · `frankfurter-adapter` · chain · push | **변경 0** | FX/머니 |
| `workers/amazon-adapter` · `yahoo-jp-adapter` | 배포되어 있지 않으면 설정만 확인. 자동 재활성 금지 | — |
| 신규 마이그레이션 1개 | 기존 DB에 컬럼 추가. 13개 원격 전용 이력을 **다시 적용하거나 repair 하지 않음** | 스키마 |
| putduk-web / putduk-ops | 이번 단계 수정 0. 인계 계약만 | 8절 |

미커밋 dirty 파일과 같은 파일을 동시에 수정하지 않는다.

---

## 7. 운영자 상품 · 가격 · 수량 · 스냅샷 설계

기존 계층(`assets` → `listings` → `opportunities.pricing` JSON → override)으로 **목표를 일부만** 충족한다. 부족한 것만 같은 Postgres에 추가한다.

### 기존으로 되는 것

- 이름/분류/사진: `assets` + `opportunities.asset_*`
- 공개/일시중지: `opportunities.status` (`available`/`paused`) — **상태 변경 API는 없음 → 추가**
- 구매가/판매가 오버라이드: `patchPricing` + `useAdminOverride`
- 사용자별 숨김/강제: `user_opportunity_overrides`
- 참여 한도: 멤버십 일일 캡 + 기회당 동시 슬롯 12
- 감사: price override audit · `admin_audit_events`(현재 0행)

### 부족 → 기존 테이블 확장 제안 (새 DB 금지)

`opportunities`에 컬럼 추가를 우선한다.

| 컬럼(제안) | 역할 |
|---|---|
| `supply_source text` CHECK (`operator` \| `legacy_external`) | 전환 중 구분. 기존 행은 `legacy_external`로만 표시. **자동 승격 금지** |
| `display_buy_channel` / `display_sell_channel` | KREAM·쿠팡·Chrono24·eBay·Amazon·Yahoo **표시만**. ingest adapter와 분리 |
| `visible_from` / `visible_until` | 노출 창. freshness와 분리 |
| `total_units` / `reserved_units` / `consumed_units` | 등록 1회 · 다수 이용. 참여마다 재등록 금지 |
| `visibility_mode` (`public` \| `assigned`) | 전체 vs 배정. 배정은 `matching_policy_assignments` 재사용 |
| 비용은 JSON이 아니라 `opportunity_cost_lines(opportunity_id, kind, amount_krw, explicit_zero)` | 누락 vs 0원 |

가격 계산(서버):

- `need_krw` = 구매가 + Σ(수수료·배송·기타) 중 **값이 있는 줄만**. null 줄은 합산 금지 → 참여 거절
- `expected_sell_krw` = 판매가
- `expected_remain_krw` = 판매가 − 필요금액 (화면 예상)
- 내부 원장 = USDT. `need_usdt` = FX 스냅샷으로 환산. 스냅샷 없거나 만료면 **임의 환율 금지 · 참여/지급 거절**
- 정밀도: 원장 `numeric(36,18)` USDT · 원화 표시는 정수 KRW. 반올림 규칙은 `approxKrwFromSnapshot` 재사용 전 **운영자 확정**
- 현재 FX 행은 `usdt_usd`가 모두 null이고 `usd_krw`를 `usdtKrw`로 쓰고 있다. 운영자 전환 전에 FX 계약을 재확인해야 한다.

`stale_at`에 미래 시각을 넣어 3초 가드를 우회하는 방안은 **금지**. 운영자 상품의 참여 가드는 `visible_from/until` + `status`만 본다. 외부 시세 3초 규칙은 legacy_external에만 남기거나 폐기한다.

수량: `SELECT … FOR UPDATE`로 `reserved_units < total_units`일 때만 예약. 중단/타임아웃/safe_stop 시 예약 반환. 동시 마지막 1개는 한쪽만 성공.

스냅샷: 참여 트랜잭션 안에 `trade_executions.asset` JSON을 확장하거나 `trade_opportunity_snapshots`를 추가해 상품명·사진 URL·표시 채널·항목별 비용·정책 id/version·FX id·수량 예약 id를 고정. 이후 운영자 수정·재가격은 이 행을 바꾸지 않는다. 정산은 **스냅샷 금액만**.

화면 예상 남는 금액 ≠ 거래 확정 금액 ≠ 원장 지급액. 확정은 `settled_profit_usdt` + `ledger_journal_id`.

기본 수수료: 운영자 상품은 `computeOpportunityPricing`의 ebay 13.5% / 플랫폼 10% / 리스크 5%를 **호출하지 않는다.** 호출하면 비용 중복·허위 차감이 난다.

---

## 8. 백엔드 · 사용자 웹 · 어드민 인계 계약

웹/어드민 레포는 수정하지 않는다. 베이스 `https://api.hiptk.app` · prefix `/api/v1` · 쿠키 `aipo_session` · Bearer. **브라우저→Supabase 직접 쓰기 금지.**

### 사용자 웹 — 현재 vs 필요

| 필요 필드 | 현재 | 구분 |
|---|---|---|
| 운영자 사진·이름 | `assetImageUrl` · `assetLabel` (다수 ebay/pokemontcg URL) | 유지, 출처를 운영자 R2로 |
| 구매처·판매처 표시 | `pricing.buyMarketLabelKo` 등 (상세만). enum `ebay_*\|admin` | **확장 제안** display channel |
| 원화 구매가·판매가 | USDT + `expectedProfitKrwApprox` number | **확장 제안** 항목별 KRW |
| 항목별 비용·총비용 | `costBufferUsdt` 합산 | **신규 또는 확장** |
| 필요금액·예상 남는 금액 | `requiredCapitalUsdt` · `expectedProfitUsdt` | **확장** KRW 병기 |
| 참여 가능 + 쉬운 한국어 사유 | toastCode (`INSUFFICIENT_PRINCIPAL`, `PRICE_STALE_DATA` …) | **확장 제안** `reasonKo` |
| 거래 id·서버 상태·복구 시각 | `tradeId` · status · Soft60/Hard90 | 유지. 70초 연출과 분리 |
| 확정 결과·원장 반영 | `settledProfitUsdt` · `ledger_journal_id`(내부) | **확장 제안** `ledgerPosted` boolean |
| 수량 잔여 | 없음 | **신규 제안** |

없는 API를 있는 것처럼 적지 않는다. 피드/상세/preflight/participate/trades/execute-tick은 **기존 경로를 확장**한다.

### 어드민

현재 백엔드 능력: 목록/상세/가격 패치/에셋 upsert/시드/카탈로그 시드/이미지 등록/유저 override.  
**없음(신규 제안):** 운영자 상품 create, preview, publish, pause, 수량, 노출 창, 표시 채널, 항목별 비용, 배정 일괄(B7 테이블 배선).

`phonarawd/putduk-ops`는 저장소가 있다. 이번 세션에서 화면↔API 실연결은 **미확인**. 연결 확인 전에는 어드민 UI를 운영 기능으로 인정하지 않는다.

### 체험사이트 이식 — 백엔드 조건

공개 페이지만 확인: `https://putduk-experience.ai-ptk.chatgpt.site`

확인: 가상 잔액 50만원 · 오늘 3회 · 표시 채널 예시(KREAM→eBay 등) · **제휴/API/주문 아님** 문구 · 70초 7단계 · 일시정지/건너뛰기 · 끝나면 가상 잔액에 더함.

원본 미확보: 모션 타이밍 곡선, 에셋 파일, 사운드, 정확한 7단계 카피 원문, 구현 소스. **완전 동일 이식 가능이라고 단정하지 않는다.**

백엔드 조건:

- localStorage/가상 잔액 지급 로직을 실서비스에 복사 금지
- 7단계 ≠ `trade.status`/`step_index`. `presentationProgress`는 Soft60을 5등분(0–4). 억지 매핑 금지
- 서버 기한 Soft60/Hard90 ≠ 70초 연출
- 건너뛰기/새로고침/다중 탭은 기존 idempotency + 상태 가드 재사용. 연출 종료 ≠ 성공
- 실제 주문·배송 이벤트 없음 → 비행/배송을 추적처럼 표시 금지
- putduk-web 하단 탭·모달 수치 유지. 체험 레이아웃을 강제하지 않음

---

## 9. 마이그레이션 필요 여부와 기존 이력 차이

- **신규 마이그레이션은 필요**하다(컬럼·비용 줄·재고). 기존 68 이력에 편입하지 말고 **새 타임스탬프 파일 1개**로만 추가한다.
- 원격에만 있는 12+1개 파일을 추측 SQL로 재작성해 apply하면 중복/충돌 위험이 있다.
- 승인 후 격리 환경에서 `supabase migration list`로 local/remote 분기만 읽고, 공식 절차(`db pull` 또는 원본 SQL 확보)로 맞춘다.  
  https://supabase.com/docs/guides/deployment/database-migrations
- `migration repair`는 이번 전환의 기본 수단이 아니다.
- 기존 외부 상품 115 · 리스팅 643 · 관측 19,338 · 과거 trade 1(`safe_stop`)을 DELETE하거나 `supply_source=operator`로 업데이트하지 않는다.

---

## 10. 검증 · 전환 · 롤백

운영 API 참여/정산 실행 금지. 운영 DB에 장애 주입 금지. 아래는 **격리 환경 계획**.

| 시나리오 | 방법 | 합격 |
|---|---|---|
| 같은 요청 재전송 · 중복 클릭 | 동일 idempotencyKey 2회 | 전표 1 · trade 1 · `reused=true` |
| 마지막 수량 동시 참여 | 잔여 1에 병렬 2 | 1 성공 · 1 거절 · reserved 일관 |
| 공개 직후 수정/중지 vs 참여 | 같은 행 FOR UPDATE | 참여는 옛 버전 거절 또는 스냅샷 고정. 중지 후 신규 참여 0 |
| 전환 전 수집 작업의 늦은 쓰기 | ingest 재전송 after gate | listings/operator 행 불변 · tick ledger만 |
| 참여 후 운영자 가격 변경 | 패치 후 execute-tick | 정산액 = 참여 스냅샷 |
| 원장 · 상태 · 알림 장애 | outbox 미전달 | 잔액/trade 일관. 알림은 at-least-once |
| 중단 · 타임아웃 · 새로고침 · 멀티탭 | Hard90 · 중복 tick | safe_stop 시 원금 반환 1회 · 수익 0 |
| 환율 누락/만료/정밀도 | FX 없이 참여 | 거절. 임의 환율 0 |
| 사진 누락 · 비용 누락 · 수량 0 | 공개/참여 | compare/publish 거절 |
| 과거 거래 조회 · 원금 반환 | 기존 safe_stop 1건 읽기 전용 | 이력 보존 |

전환 순서:

1. 현재 기준 = 본 보고서 SHA/DB 68
2. 계약 확정(본 문서 7–8) · 운영자 결정(11)
3. 승인 후 구현 · 격리 검증
4. 운영자 상품 유효성(사진·비용·수량·창·권한)
5. 외부 상품 쓰기 게이트 ON · 큐/늦은 틱 소진 확인
6. 승인 시각에 피드가 `supply_source=operator`만 노출
7. 이후 listings/opportunities 외부 쓰기 0 · 버킷 불변

진행 중 거래: 현재 `safe_stop` 1건뿐. 전환 시점에 `running/requeue`가 있으면 스냅샷으로 끝까지 처리하거나 검증된 safe-stop(원금 전액 1회). 삭제·개조 금지.

롤백: 신규 참여 kill-switch(`opportunity`)로 중지. 외부 파서 cron **자동 재활성 금지**. 원장/이력/운영자 상품 보존. 피드만 이전 필터로 되돌리려면 `legacy_external` 재노출은 **별도 승인**.

---

## 11. 운영자 결정이 필요한 항목

1. 기존 115개 외부 기회: 숨김 유지 vs 수동 재등록만 허용 (자동 변환 금지)
2. 표시 채널 목록 확정(KREAM 등)과 상표 표기
3. 체험 자금 소스: 기존 `practice` 버킷 vs DB `trial_*` 배선. 둘 다 쓰면 이중 지급
4. 원화 반올림·USDT 환산 공식 (현재 `usd_krw`를 `usdtKrw`로 쓰는 계약 인정 여부)
5. 운영자 가격 유효 기본 기간
6. 수량 소진 후 동작(일시중지 vs 품절 노출)
7. B7 배정 vs override 핀의 우선순위
8. 체험 7단계 원본 에셋 확보 여부
9. `trade_execution_confirmations` RLS를 누가 언제 켜는지 (이번 전환과 분리 가능)
10. 원격 전용 마이그레이션 원본 SQL 소재

---

## 12. 실제 패치 단계에서 가장 먼저 할 작업

승인 전 패치 없음.

승인 후 1순위:

1. dirty worktree를 건드리지 않고 `27b5b9f7`에서 **새 브랜치만** 사용
2. `supply_source` 컬럼 + ingest/reprice/이미지 provenance **쓰기 게이트**(기본 OFF)
3. 운영자 상품이 게이트 ON이어도 덮이지 않음을 격리 테스트로 증명
4. 그 다음 등록 API · 스냅샷 정산 · 2트랜잭션 결합

외부 cron 삭제는 5단계(쓰기 차단) 이전 금지. FX/chain/push는 항상 유지.

---

## 부록 A — 라이브 카탈로그 스냅샷 (읽기 전용)

- assets 114 · image_source ebay 72 / pokemontcg 32 / ygoprodeck 9 / admin_r2 1
- opportunities 115 · trial_eligible true 1
- listings 643 · 100% eBay US/GB
- source_observations 19338 · fashionphile only
- canonical_products 5 · match_results 0
- provider_tick_ledger ebay 4413
- trade_executions: safe_stop 1 · participate_requests 1
- ledger_journals 9 · entries 18 · outbox 9
- fx_snapshots 7 · 최신 2026-09-08
- matching_policy_* 0행

## 부록 B — 변경하지 않은 것

코드, 설정, 의존성, lockfile, CI, 마이그레이션 파일, 운영 DB, 브랜치, 커밋, 푸시, 배포, 비밀 출력 없음.
