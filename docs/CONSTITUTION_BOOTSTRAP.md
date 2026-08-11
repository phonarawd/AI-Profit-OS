# Constitution Bootstrap — Platform Redesign R0 실물 대조 기록 (v7.23.0)

> **목적:** 구현 채팅 시작 전, 헌법·스키마·마이그레이션·어드민·브랜드·DB SSOT를 **예측 없이** 정리한다.  
> **권위:** ACTIVE Index `ai_profit_os_00_index_a1b2c3d4.plan.md` > 도메인 01~06 > launch ARCHIVE.  
> **현재 권위:** Index v7.23.0 · R0 governance CLOSE(inventory→fact/state→change-control→observation) · 외부 `플랫폼_전체_재설계_로드맵_d903eef7`=REFERENCE ONLY · 기존 v7.22 스냅샷/「현재」「다음」문구는 이력.
> **현재 다음:** 02.5 Engine Acceptance QA · 첫 pending=`qa1-deterministic-truth` (QA-0 `qa0-baseline-freeze` CLOSED · verdict≠ACCEPTED · 03 UI **BLOCKED** until `ENGINE_ACCEPTED_FOR_UI`).

## v7.23.0 현재 잠금

- Runtime 단계는 `Runtime P0~P3`, 재설계 실행은 `Redesign R0~R8`로 구분한다.
- File-Serial: 00 R0 → 01 Money R1 → 02 Engine R1 → **02.5 Engine Acceptance QA** → 03 UI R1~R5 → 04 Admin R6 → 05 PWA → 06 R7/R8.
- 03 UI 착수 선행: `VERDICT == ENGINE_ACCEPTED_FOR_UI` **and** `acceptance_scope.unchanged` (`governance/engine-acceptance/`).
- Consumer theme=ADR-017 `peotteok-light` Light+Purple 단일, 5탭=홈·기회·수익·지갑·내정보.
- Web/Ops origin=`infra/domain.manifest.json openNext.*.workersDev`; OpenNext Workers only, Pages deploy/pages.dev origin 금지.
- v7.22 completed todo는 불변이며 신규 가산 todo만 실행한다.
- 아래 DB/파일 개수는 이력 스냅샷이다. R0 `baseline.v1.json`이 commit SHA·dirty paths·정규화 규칙과 함께 최신 수치를 확정한다.

---

## 0. 실물 상태 (스캔 결과 · 오차0 · v7.22.36 Index CLOSE)

| 경로 / 대상 | 상태 | 비고 |
|-------------|------|------|
| `CONSTITUTION/` | ✅ **29** MD | §2 목록 전수 · constitution-28* **completed** |
| `schemas/` | ✅ **38** files | 계약 **37** + `manifest.day1.json` · schemas-contracts-core **completed** |
| `supabase/migrations/` | ✅ **10** SQL | 로컬 = 원격 applied **1:1** (버전 `20260808205842`~`20260808224856`) |
| `apps/` | ✅ `web`+`admin` | next@16.3.0 · TW4 · monorepo-skeleton **completed** |
| `services/` | ✅ | `api-nest`(Nest JWT Auth) · `engine-rust` · `marketing-attribution` |
| `workers/` | ✅ Runtime P0+scaffold | Runtime P0=`push-dispatcher` only · adapters/chain = Runtime P1+ 골격 |
| `infra/` | ✅ Runtime P0 hosts | OpenNext Workers · `domain.manifest.json`/`hosts.manifest.json` · api runtime · R2 kyc · playbook |
| `packages/ui/brand/brand.manifest.json` | ✅ | Consumer/AI=**퍼뜩** · retired=`오늘수익`·`바로번다` |
| `packages/ui/tokens/peotteok-light.specification.md` | ✅ | ADR-017 Light+Purple → runtime token mirror |
| `packages/ui/canon/surfaces/*.wire.json` | ✅ | auth/onboarding/kyc/execution/peotteok/invite/membership 등 |
| `packages/ui/copy/ko` | ✅ live | `execution.ts`·`opportunity.ts` · CTA/면책/Soft·Hard |
| `AGENTS.md` · `TOOLCHAIN.md` · ADR-016 | ✅ | Node22 · pnpm@10.14 · next@16 · TW4 · PG사0 |
| `tooling/verify/*` | ✅ | gate live · auth-flows · phase0-bootstrap · IA/admin routes |
| Supabase project | ✅ | ref=`mgsytcetsiecllmhcyox` · Seoul `ap-northeast-2` · PG **17.6** · ACTIVE_HEALTHY |
| Supabase `public` 테이블 | ✅ **41** | RLS ON 전수 · Nest service_role SoT · anon policy **의도적 0** |
| Supabase migrations applied | ✅ **10** | MCP `list_migrations` = 로컬 파일명/버전 일치 |
| `vector`(pgvector) | ✅ **0.8.2** | `memory_embeddings` |
| 설치 확장 (installed) | 확인 | `plpgsql` · `pgcrypto` · `uuid-ossp` · `supabase_vault` · `pg_stat_statements` · **`vector`** |
| public 함수 | ✅ **4** | ledger_*3 + `users_stage_a_identity_ok` |
| public 트리거 | ✅ ledger guards | balance_guard · entries/journals immutable |
| Supabase Auth 앱 사용 | **0** | Nest JWT only · 시스템 `auth` ≠ Auth SoT |
| GitHub | ✅ | `phonarawd/AI-Profit-OS` · 코드만 |
| Index 플랜 | ✅ **R0 CLOSE** | 기존 completed 불변 · R0 4게이트 live · post-r0 Money obs promote wave1 |
| Advisor `rls_enabled_no_policy` | INFO 전수 | Day-1 **의도** · deny-by-default |

**v7.22.36 판정(이력):** Index 당시 CLOSED · 헌법·스키마·원격 PG·Auth·Runtime P0 hosts·apps 골격 PASS.
**v7.23 현재:** R0 CLOSE · 01 Money pending0 · 02 Engine pending0 · **02.5 QA-0 baseline FROZEN** · 다음=02.5 `qa1-deterministic-truth` · 03 UI는 `ENGINE_ACCEPTED_FOR_UI` 전 **BLOCKED**.

### 0.1 public 테이블 전수 (41 · MCP 실측)

`admin_rbac` · `ai_events` · `ai_feedback` · `ai_logs` · `ai_memory` · `ai_user_profile` · `assets` · `auth_magic_link_challenges` · `auth_oauth_identities` · `auth_passkeys` · `auth_sessions` · `deposit_config` · `execution_policies` · `fx_snapshots` · `krw_deposit_requests` · `kyc_status` · `kyc_submissions` · `ledger_accounts` · `ledger_entries` · `ledger_journals` · `memory_embeddings` · `notification_prefs` · `opportunities` · `ops_inbox_messages` · `participate_requests` · `referral_edges` · `referral_program_config` · `support_tickets` · `tendency_memos` · `trade_executions` · `usdt_deposit_events` · `user_attributions` · `user_capability` · `user_deposit_addresses` · `user_match_policy_overrides` · `user_membership` · `user_opportunity_overrides` · `user_profiles` · `user_ux_prefs` · `users` · `withdraw_intents`

### 0.2 적용 마이그레이션 전수 (10)

1. `20260808205842_extensions_vector`  
2. `20260808205844_identity_nest_auth`  
3. `20260808205846_ledger_accounts_journals`  
4. `20260808205848_wallet_deposit_withdraw`  
5. `20260808205850_opportunities_pricing`  
6. `20260808205853_ai_twin_memory`  
7. `20260808205857_referral_support_attribution`  
8. `20260808205901_rls_ledger_guards`  
9. `20260808210600_rls_security_hardening`  
10. `20260808224856_auth_oauth_passkey_stage_a_b`

---


---


### 0.3 Money 착수 전 실측 (v7.22.37 · `money-preflight-constitution` · 2026-08-09 재스캔)

> **Owns:** Money 착수 게이트 기록 · 구현코드 **0** · 다음 todo=`money-double-entry`  
> **방법:** Supabase MCP `list_tables`/`list_migrations`/`execute_sql`/`get_project` + 레포 FS · `pnpm verify:admin-routes` · `pnpm verify:pg-module-scan`

| 대상 | 실측 | Money 함의 |
|------|------|------------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul `ap-northeast-2` · PG **17.6** · ACTIVE_HEALTHY | 원격 only · Docker OFF |
| `public` 테이블 | **41** · RLS ON 전수 | ledger/wallet/kyc/referral 표 존재 · Nest service_role |
| migrations applied | **10** · 끝=`20260808224856_auth_oauth_passkey_stage_a_b` | 로컬 파일명 1:1 · Dashboard DDL 0 |
| public 함수 **4** | `ledger_forbid_mutation` · `ledger_require_posting_flag` · `provision_user_bucket_accounts` · `users_stage_a_identity_ok` | **posting RPC 0** → Nest TX+flag (`money-double-entry`) |
| ledger seed | system accounts **7** (`SYS:OPPORTUNITY_POOL`·`TREASURY`·`FX_CLEARING`·`OPS_POOL`·`PROMO_POOL`·`SUSPENSE`·`FEE_REVENUE`) | 유저 버킷=signup provision |
| `deposit_config` DDL | columns=`krw`·`usdt_onchain`·`pricing_guards` jsonb · rows **0** | schema `withdrawGuards` 계약 잠금 · **DDL 컬럼 `withdraw_guards` 아직 0** → `money-fee-min-holding` |
| `schemas/` | **38** files · `deposit-config.v1`에 `krwWithdrawFeeKrw`·`usdtWithdrawNetworkFeeUsdt`·`minHoldingHours`·`sweeperPaused` | §11.1/§11.2 스키마 공백 **해소** |
| `services/` | `api-nest` · `engine-rust` · `marketing-attribution` · **`wallet-service` 0** | Nest 모듈 잠금 |
| `workers/chain-*` | Phase1+ stub (`phase=1` description) | Money 구현 · Phase1 deploy |
| `apps/admin/routes.ts` | TOP **12** · child에 `/admin/compliance?tab=kyc` · deposit-settings/review/krw-pending/disputes | sidebar 13 금지 · UI deep=Admin |
| Auth | Nest JWT · Supabase Auth **0** | KYC/출금 step-up도 Nest |
| PG사 | 코드경로 0 · Day-1 KRW=Admin 승인/거절 · CSV=L2+ | `pg-gateway-ban.mdc` 교정됨 |
| CI (본 todo) | `verify:admin-routes` **PASS** · `verify:pg-module-scan` **PASS** | money 게이트 live |

#### 0.3.1 헌법 Money Owns 읽기 확인 (17/37/39/41/42/43/49/51r)

| 파일 | 판정 |
|------|------|
| `17_FINANCIAL_LEDGER_STANDARD.md` | ✅ double-entry · PG사 금지 · **api-nest 경로 잠금** · wallet-service 금지 |
| `37_WALLET_AND_USER_ADMIN_OPS.md` | ✅ deposit-config · Admin wallet tabs pointer |
| `39_USER_FINANCIAL_LEDGER.md` | ✅ finance/reports surfaces · ledger KPI only |
| `41_ONCHAIN_USDT_AND_KRW_DEPOSIT.md` | ✅ PG사0 · KRW Admin 승인/거절 · CSV=L2+ |
| `42_KYC_WITHDRAW_ONE_TIME_GATE.md` | ✅ `/admin/compliance?tab=kyc` (routes와 일치) |
| `43_CHAIN_SETTLEMENT_HARDENING.md` | ✅ 1/19 · sweeper · **Phase0=in-process** · NATS=Phase1+ |
| `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` | ✅ 4버킷 · principalUsdt · P*/E* |
| `51_REFERRAL_VIRAL_LADDER.md` | ✅ 초대∞ · L2/L3 · Admin `growth?tab=referral` |

#### 0.3.2 흡수 모순 (규칙/스키마 · 완료 · 구현코드 0)

| # | 발견 | 해소 |
|---|------|------|
| M1 | `wallet-service` 유령 경로 | → api-nest 모듈 · §17 잠금 · FS에 폴더 **0** |
| M2 | Phase0 NATS 혼동 | → §43 Phase0 in-process · NATS=Phase1+ |
| M3 | `pg-gateway-ban` Auto-Recon-only | → Day-1=Admin 승인/거절 · CSV=L2+ · verify 강제 |
| M4 | `compliance?tab=kyc` routes 누락 | → `ADMIN_CHILD_ROUTES` + verify:admin-routes |
| M5 | fee/minHolding 스키마 공백 | → `deposit-config.v1` 필드 잠금 (DDL 컬럼은 fee todo) |
| M6 | composer 혼재 | → Money 전 todo `grok-4.5\|256K` (플랜 YAML) |
| M7 | participate pricing Money 혼재 | → Engine Owns pointer (본 preflight 범위 0) |
| M8 | Admin Money 계약 표 | → Money 플랜 §0.4 (편집 본 todo 외) |

**판정:** 규칙↔스키마↔헌법 Money Owns = **모순0** · 구현코드 **0** · `money-preflight-constitution` **PASS**.  
**다음 채팅:** `money-double-entry` only.

### 0.4 Engine 착수 전 실측 (v7.22.39 · `engine-preflight-constitution` · 2026-08-09)

> **Owns:** Engine 착수 게이트 기록 · 구현코드 최소(Admin routes/verify sync만) · 다음 todo=`market-intel-engine`  
> **방법:** Supabase MCP `list_tables`/`list_migrations`/`execute_sql` + 레포 FS · Admin routes 대조  
> **선행:** 01 Money **CLOSED** (v7.22.38 · todos 15/15)

| 대상 | 실측 | Engine 함의 |
|------|------|-------------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG **17.6** · ACTIVE_HEALTHY | 원격 only · Docker OFF |
| `public` 테이블 | **58** · RLS ON 전수 | assets/opportunities/execution_policies/ai_*/user_membership 존재 |
| migrations applied | **18** · 끝=`20260809010858_referral_pool_fifo_clawback` · 로컬 버전 1:1 | Dashboard DDL 0 |
| public 함수 | **4** (ledger_*3 + users_stage_a_identity_ok) | Rule RPC 0 → Nest+engine-rust |
| `vector` | **0.8.2** | memory_embeddings · §47 |
| `user_opportunity_overrides` | 컬럼=`hidden,pinned,margin_override_usdt` | **≠** schema forceShow/pinOrder/… → Engine todo `engine-override-ddl-align` |
| `services/engine-rust` | settlement_rule = SafeStop skeleton | Soft60/Hard90 SSOT 잠금 ≠ 구현완료 |
| `workers/*-adapter` | ebay·pokemontcg·ygoprodeck·coingecko·frankfurter · yahoo-jp **0** | 코드 Owns=Engine · Phase1 deploy |
| Admin 자식 | +`opportunities?tab=assets` · +`system-control?tab=reserve` | sidebar 13 금지 · Engine §0.4 |
| AI 이름 | **퍼뜩** | 클라이 등 타명 surface **0** |

#### 0.4.1 헌법 Engine Owns 읽기 확인 (44/45/46/46b/47/48/51)

| 파일 | 판정 |
|------|------|
| `44_SIGNUP_READY_MARKET_SOURCES.md` | ✅ ebay멀티\|admin · yahoo Day-1 leg **0**(§5h2 supersede · v7.22.41 Partner·§38.10 표기) |
| `45_PRICE_COMPARE_MARGIN_UX.md` | ✅ PriceCompareMargin |
| `46_CAPITAL_TIER_CATALOG.md` | ✅ capitalBand |
| `46b_ASSET_IMAGE_SSOT.md` | ✅ assetImageUrl |
| `47_PERSONAL_AI_USER_TWIN.md` | ✅ 퍼뜩 P/G/S |
| `48_AI_EXECUTION_ROOM_AND_POLICY.md` | ✅ Soft60/Hard90 · Rule |
| `51_PLATFORM_COMPLETENESS_AND_RULE_ENGINE.md` | ✅ Sim·KPI |

#### 0.4.2 흡수 모순 (완료)

| # | 발견 | 해소 |
|---|------|------|
| E1 | BOOTSTRAP 다음=01 Money 잔존 | → 다음=02 Engine `market-intel-engine` |
| E2 | override DDL≠schema | → Engine `engine-override-ddl-align` |
| E3 | `/admin/assets` 유령 | → `opportunities?tab=assets` |
| E4 | reserve tab 누락 | → `system-control?tab=reserve` |
| E5 | nearMissCap 이중 표기 | → execution-policy only |
| E6 | Soft 용어 충돌 | → priceSoftAccept ≠ Soft60 wall |
| E7 | Soft/Hard completed vs skeleton | → SSOT 잠금 vs 구현 todo 분리 |

**판정:** Engine preflight **PASS** (이력 · v7.22.39). **CLOSE = §0.5 (v7.22.44).**
### 0.5 Engine CLOSE 재검증 (v7.22.44 · 2026-08-09 · 예측0)

> **Owns:** Engine 플랜 종료 게이트 기록 · todos **26/26 completed · pending 0**.
> **실측:** Supabase MCP + FS + Engine `verify:*` 전수.

| 대상 | 종료 실측 | 판정 |
|------|-----------|------|
| Supabase ref | `mgsytcetsiecllmhcyox` · Seoul · PG 17.6 · ACTIVE_HEALTHY | ✅ |
| `public` 테이블 | **76** · RLS ON | ✅ |
| migrations applied | **25** · 로컬 파일명 버전 **1:1** · 끝=`20260809103208_ai_feature_platform_pick_eval_shadow` | ✅ |
| public 함수 | **5** (+`user_opportunity_overrides_pin_cap`) · Rule RPC 0 | ✅ |
| override DDL | force_show/pin_order/margin_pct/expected_profit/capital_band_force · 구 pinned 0 | ✅ |
| engine-rust | R1~R10 Soft60/Hard90 REQUEUE MATCH_TIMEOUT · golden live | ✅ |
| adapters | Day-1 5종 + amazon/yahoo-jp Phase1+ | ✅ |
| Engine verify | listing~coach/admin-routes/pg-module-scan **전수 PASS** | ✅ |

**판정(이력 · v7.22.44):** Engine todos 1~26 = **CLOSED** · completed 재실행 **금지**.
**File-Serial v7.22.59 이력:** 당시 다음=03 UI `trust-age-spotcheck`; R0 기간 포인터=00 inventory. **현재 다음:** 01 Money `redesign-r1-money-read-contract`. PART0~9와 Pre-UI Runtime Gate completed는 불변이다.


### 0.5.1 Pre-UI Runtime Gate (v7.22.48 착수 → **v7.22.49 CLOSE**)

> **Owns:** Index A12 pointer + MCP 재실측 · E-R1~E-R8 + Money benefits.  
> **흡수 SSOT:** Engine `§0.9` · 고아 홈 플랜 `pre-ui_engine_gate_8f59a783.plan.md` = **삭제됨**(중복0).

| 대상 | CLOSE 실측 (v7.22.49) | 판정 |
|------|----------------------|------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG 17.6 · ACTIVE_HEALTHY | ✅ |
| public 테이블 / 함수 | **76** / **5** | ✅ |
| migrations | **28** 로컬=원격 1:1 · 끝=`20260809144814_catalog_runtime_day1_fx_bootstrap` | ✅ |
| `execution_policies` active | **1** · `matchStrictness=standard` | ✅ |
| `opportunities` available | **3** · assets **94** · listings **12** | ✅ |
| 유저 feed/participate/trades HTTP | live · 신규 3게이트 PASS | ✅ |
| `MissionModule` controllers | `BenefitsUserController` · GET `/me/benefits(+summary)` | ✅ |
| `GET /me/membership` | live (E-R7) | ✅ |
| Engine/Money 가산 | E-R1~E-R8 + `money-user-benefits-read` **completed** | ✅ |

**판정:** Pre-UI Runtime Gate = **CLOSED** · UI PART0~8c+PART9 = **CLOSED (v7.22.59)** · File-Serial 다음 = **03 UI** `trust-age-spotcheck` only.  
**금지:** Engine/Money/UI-PART0~9(가산 포함) completed 재실행 · 고아 병렬 플랜 재생성.

---

## 1. 작업 전 읽기 순서 (한 채팅=한 todo)

1. `TOOLCHAIN.md` + `.cursor/rules/*` (always) + 해당 glob  
2. ACTIVE Index: `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md`  
3. 도메인 플랜 **하나만** (`01`~`06` 실제 파일명 해시 포함) — **File-Serial:** 파일 N의 todos가 전부 `completed`되기 전 파일 N+1 착수 금지 · 파일 내 todos 위→아래  
4. launch (`ai_profit_os_launch_54c1261e.plan.md`) = **ARCHIVE** (편집 시 분리 플랜 우선)  
5. UI면 Canon wire + Brand Kit + Lux  
6. Money면 `money-ledger.mdc` + bucket gates  

### 실제 플랜 파일명 (이름 drift 금지 · v7.22.35 File-Serial)

| # | 논리명 | **실파일** |
|---|--------|------------|
| 00 | Index | `ai_profit_os_00_index_a1b2c3d4.plan.md` |
| 01 | Money *(구 02)* | `ai_profit_os_01_money_c3d4e5f6.plan.md` |
| 02 | Engine *(구 01)* | `ai_profit_os_02_engine_b2c3d4e5.plan.md` |
| 03 | UI/UX | `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| 04 | Admin | `ai_profit_os_04_admin_e5f6a7b8.plan.md` |
| 05 | PWA | `ai_profit_os_05_pwa_f6a7b8c9.plan.md` |
| 06 | Infra | `ai_profit_os_06_infra_a7b8c9d0.plan.md` |
| — | ARCHIVE | `ai_profit_os_launch_54c1261e.plan.md` |

> 구 pointer `*_ssot.plan.md` / `*_native.plan.md` 등 **논리명 파일**은 STALE ALIAS stub로 고정됨.  
> 본문 편집·todo 실행은 **해시 ACTIVE 파일만**.  
> 구번호(Engine=옛1번·Money=옛2번) 파일명 문자열 = **금지** — 실파일은 위 표만.

---

## 2. 헌법 파일 생성 목록 (`CONSTITUTION/` · constitution-28)

생성 순서 = 번호순. 각 파일 **owns 1주제** · 교차는 pointer만 (§22).

| # | 파일 | owns |
|---|------|------|
| 14 | `14_EVENT_CONTRACTS.md` | Phase0 in-process · Phase1 NATS 이벤트 |
| 17 | `17_FINANCIAL_LEDGER_STANDARD.md` | Double-Entry · idempotency |
| 20 | `20_SECURITY_THREAT_MODEL.md` | A1~ abuse |
| 22 | `22_UX_AND_COPY_SSOT.md` | 5탭·레이아웃·버튼 (문자열→25) |
| 23 | `23_PWA_AND_NATIVE_EXPERIENCE.md` | PWA |
| 24 | `24_FREE_TIER_AND_STORE_BRIDGE.md` | $0 · TWA |
| 25 | `25_KOREAN_FIRST_UX_POLICY.md` | ko copy·금지어·CI |
| 26 | `26_PERFORMANCE_AND_RESPONSIVE_UX.md` | fluid·tier |
| 27 | `27_MARKETING_AND_SEO_ENGINE.md` | CAPI·SEO |
| 28 | `28_LUX_FINTECH_DESIGN_AND_MOTION.md` | Lux·motion·G4 |
| 35 | `35_GROWTH_CONVERSION_PRESENTATION.md` | G1~G4 |
| 36 | `36_ADMIN_PRICE_AND_PROFIT_SYNC.md` | Admin 가격 SSE |
| 37 | `37_WALLET_AND_USER_ADMIN_OPS.md` | 입금설정·회원 |
| 38 | `38_TRUST_EDUCATION_AND_REVENUE_TRANSPARENCY.md` | Trust |
| 39 | `39_USER_FINANCIAL_LEDGER.md` | 유저별 금융전수 |
| 40 | `40_ADMIN_ISOLATED_OPS_PLATFORM.md` | ops 분리 |
| 41 | `41_ONCHAIN_USDT_AND_KRW_DEPOSIT.md` | TRC20·KRW · PG사0 |
| 42 | `42_KYC_WITHDRAW_ONE_TIME_GATE.md` | 출금 KYC |
| 43 | `43_CHAIN_SETTLEMENT_HARDENING.md` | chain·락·Auth fallback |
| 44 | `44_SIGNUP_READY_MARKET_SOURCES.md` | Signup-Ready adapters |
| 45 | `45_PRICE_COMPARE_MARGIN_UX.md` | §0.0.4 가격비교→마진 |
| 46 | `46_CAPITAL_TIER_CATALOG.md` | §0.0.5 capitalBand |
| 46b | `46b_ASSET_IMAGE_SSOT.md` | §0.0.6 `assetImageUrl`·카테고리 썸네일 |
| 47 | `47_PERSONAL_AI_USER_TWIN.md` | Personal AI + **퍼뜩(§47.12~14 P/G/S·Adapter)** |
| 48 | `48_AI_EXECUTION_ROOM_AND_POLICY.md` | 진행실·Rule · §48.3a 썸네일 표시 |
| 49 | `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` | 버킷·출금 |
| 50 | `50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md` | 설정·약관·DET·쉬운한글 |
| 51 | `51_PLATFORM_COMPLETENESS_AND_RULE_ENGINE.md` | Rule·Sim·CS·Trust |
| 51r | `51_REFERRAL_VIRAL_LADDER.md` | §51.5 초대∞·Pool·Ladder |

**동시 기록 (repo root / docs):**

| 문서 | 역할 |
|------|------|
| `AGENTS.md` | 에이전트 읽기순서 · 브랜드=퍼뜩 |
| `TOOLCHAIN.md` | ADR-015 핀 · Docker-less 기본 |
| `docs/ADR-016-AGENT-AUTOMATION.md` | hooks/Husky/CI |
| `COMPANY_REGISTRATION_SUMMARY.md` | §50.9 KYB 편의복사 (SSOT≠여기) |
| `FOOTER_LICENSE_COPY.md` | 푸터 라이선스 문구 |
| `packages/ui/brand/*` | ADR-002 Brand Kit |
| `this file` | 착수 전 체크리스트 |

---

## 3. 스키마·마이그레이션 선행 (`schemas-contracts`)

### 3.1 `schemas/` (JSON contract · 최소 Day-1)

`operator-entity.v1` · `user-ux-prefs.v1` (toneBand·fontScale·depositPref) · `user-membership.v1` · `user-capability.v1` (`matchBlocked`·`withdrawApplyBlocked`) · `notification-prefs.v1` · `ops-inbox-message.v1` · `wallet-buckets.v1` · `withdraw-intent.v1` · `deposit-config.v1` · `krw-deposit-request.v1` · `user-deposit-address.v1` · `kyc-status.v1` · `asset-master.v1` (**imageUrl** · §0.0.6) · `opportunity-card.v1` (**assetImageUrl** · category=`watch|trading_card|luxury_bag`) · `user-opportunity-override.v1` (**§9.8.9**) · `user-match-policy-override.v1` · `tendency-memo.v1` · `opportunity-pricing.v1` · `execution-policy.v1` · `trade-execution-state.v1` · `toast-codes.v1` · `participate-request.v1` · `participate-proof.v1` · `simulation-report.v1` · `referral-program.v1` · `support-ticket.v1` · `admin-rbac.v1` · `user-financial-summary.v1` · `user-attribution.v1` · `ui-copy-glossary.v1` · (AI) twin/fact/answer-trace per §47

### 3.2 `supabase/migrations/` (단일 PG · Seoul)

> **실측(2026-08-09 · v7.22.36):** applied migrations **10** · `public` 테이블 **41** · `vector` **0.8.2 installed** · 시스템 `auth/storage/realtime` 스키마는 플랫폼 기본(앱 Auth SoT 아님).

순서 잠금:

1. extensions (`vector`/pgvector · 필요 시 `pgcrypto` 재확인)  
2. ledger_* + bucket accounts  
3. wallet / deposit / withdraw  
4. opportunities / pricing  
5. ai_* (동일 인스턴스 · ADR-001)  
6. referral / support / attribution  
7. RLS ON · ledger direct UPDATE 트리거 금지  

Apply: CLI/`db push` · **Dashboard DDL 금지**.  
Auth: Nest JWT only · Supabase Auth SDK/API **0** (시스템 `auth` 스키마 존재 ≠ SoT).

---

## 4. 브랜드 잠금 (ADR-002 · 검증됨)

| 층 | 값 |
|----|-----|
| Platform | AI Profit OS |
| Consumer | **퍼뜩** |
| AI | **퍼뜩** (앱명과 동일 · §47.12) |
| Legal | §50.9 PRE-OWNED WATCHES L.L.C · DET 1135431 |
| Retired | `오늘수익` · `바로번다` |

CI: `pnpm verify:brand-consumer` (apps/web · packages/ui/copy 에서 retired **0**).

---

## 5. 퍼뜩 (AI) — 헌법 흡수 포인터

- **유저 AI 이름:** **퍼뜩** (앱명과 동일) — 타프로젝트 코치명 금지
- **레인:** **P**=플랫폼 Fact tools · **G**=일상 LLM · **S**=실행 거절 (v7.22.16)
- **Adapter Day-1:** **`gemini_free` 1개** (AI Studio 키 · `.env` only) → 이후 `openai` · 쿼터 시 degrade=`none`
- **엔진 SSOT:** §47 Personal AI (Twin + Memory + Fact + Guard)  
- **역할:** 구현된 Fact만 흡수 → 미션·입금·출금·초대·이벤트·CS 제안·안내  
- **UX Fact:** `toneBand` · `fontScale` · `depositPref` (UI §38.9 · §50.1)  
- **금지:** AI 자율 출금/지급 · Twin으로 잔액/호가 · 미구현 vertical 환각 · **성별 맞춤 멘트**  
- **Admin:** `/admin/ai-logs?tab=coach` (톱레벨 13 금지)

상세: Engine §47.12~14 · UI §6.4e·§38.8~38.9 · Index **v7.22.16** · `brand.manifest.json` → `ai.name`.

### 5g. PWA 잠금 (v7.22.17 · 중복0)

| 항목 | SSOT |
|------|------|
| 플랜 | `ai_profit_os_05_pwa_f6a7b8c9.plan.md` **v7.22.25** |
| next | **next@16** + Serwist · next@15 0 |
| Push 버스 | Phase0 **in-process** → push-dispatcher · NATS=Phase1+ |
| 색 | Lux bg/principal · `#1A56FF` 금지 |
| WebAuthn | 정책=Money §43.6 · UX=PWA §23.6 |
| §24 | Store Bridge only · Infra pointer |
| Admin | `pushEnabled` @ system-control |
| CI | `verify:pwa-*` · `push-dedup` · `pwa-phase0-bus` · `webauthn-fallback-pointer` |
| Day-1 아님 | FCM · TWA · Capacitor · 오프라인 머니 큐 |

### 5f. 퍼뜩 P/G/S 잠금 (v7.22.16 · 중복0)

| 항목 | SSOT |
|------|------|
| Intent → P/G/S | Engine §47.14 |
| Fact tools · Help RAG | Engine §47.12 |
| LLMAdapter Day-1 | Engine §47.13 · **`LLM_PROVIDER=gemini_free`** |
| 쿼터/429 | degrade → G=`PEOTTEOK_LLM_BUSY` · P=Fact 유지 · 자동 failover 0 |
| ENV | `GEMINI_API_KEY` · `GEMINI_MODEL` · `LLM_QUOTA_SOFT_RPM/RPD` · 커밋 0 |
| UI stream+면책 | UI §6.4e · Canon peotteok 1.3 · §8.2 busy toast |
| CI | `ai-coach-fact-only`(P) · `ai-general-no-money-tools` · `ai-lane-router` · `llm-adapter-contract` · `llm-quota-degrade` |
| 금지 카피 | “모든 질문 완벽/오류0” · 무료한도=무제한 |

### 5f-ops. Gemini 키 운영 체크 (사람이 할 일 · 에이전트는 키 발급 불가)

1. https://aistudio.google.com/apikey 에서 키 발급  
2. 워크스페이스 **`.env`**(gitignored)에만 붙여넣기 — `.env.example` 실키 **금지**  
3. `LLM_PROVIDER=gemini_free` · `GEMINI_API_KEY` 슬롯 · (선택) soft RPM/RPD  
4. `pnpm verify:secrets` PASS 후 커밋 · Adapter 구현 전에도 키 보관 OK  

### 5e. UI 잠금 (v7.22.15 · 중복0)

| 항목 | SSOT |
|------|------|
| Loop/DayPulse/PreCTA | UI **§51.24** (Admin/Engine pointer 대상 · 유령 금지) |
| 퍼뜩 UI | `/me/peotteok` · Canon `peotteok-chat` · Engine §47.12~14 P/G/S |
| Stage B UI | Canon `auth-complete-profile` · Infra §51.9.1 |
| KRW 거절 토스트 | UI §8.2 `KRW_DEPOSIT_REJECTED` |
| 마진 화면 | UI 컴포넌트 · 공식=Engine §0.0.4 |

### 5h. 카테고리 상품 이미지 (v7.22.20 · 중복0)

| 항목 | SSOT |
|------|------|
| 필드·hydrate·공개 가드 | Engine **§0.0.6** · `assetImageUrl` 없으면 available 자동공개 0 |
| 카테고리 | `watch` · `trading_card` · **`luxury_bag`** |
| 진행 UI | UI **§48.3a** 썸네일 · 스텝 active **`시세 불러오는 중...`** |
| Canon | `execution-running`/`success` `productThumb` · manifest **1.3.2** |
| 검증 | `verify:asset-image-surface` · `verify:execution-surfaces` |

### 5h2. Listing legs · Yahoo Day-1 adapter 0 · Partner 표기 (v7.22.41 supersede · E-R1 pointer · 중복0)

> **E-R1(v7.22.48):** v7.22.32 「영구 FORBIDDEN」문구는 **Day-1 listing leg/adapter/ENV=0** 의미로만 유효. v7.22.41 Founder lock이 supersede — Yahoo! JAPAN Auction=**공식 협력사** · UI §38.10 표기 **필수** · leg live=Phase1+ `market-partner-adapters-phase1`. Owns 상세=Engine §0.0.1a·§0.0.1c.

| 항목 | SSOT |
|------|------|
| 자동 | `ebay` @ `EBAY_US` × `EBAY_GB`(또는 DE/AU) |
| 반자동 | `ebay` × `admin` (운영자 기준가) |
| `yahoo_jp` | **공식 협력사**(v7.22.41) · Day-1 listing leg **코드/ENV/워커/INSERT 0** · Phase1+ adapter todo · UI §38.10 Trust 표기 **필수**(표기≠leg live) |
| 유저 카피 | Day-1 adapter/워커/ENV 경로 야후 **0** · LabelKo+로고=UI Brand · `buyMarketLabelKo`/`sellMarketLabelKo` |
| 금지 | KR 중고앱 · Chrono24 · 스크래핑 · Day-1 yahoo INSERT/leg · 「영구 FORBIDDEN」으로 §38.10 표기까지 막는 오독 |
| 검증 | `verify:listing-legs-day1` · `verify:market-partner-trust`(UI pointer) |
| 사람 준비 | eBay 키 · Yahoo AppID=Phase1+ · 표기 자산=UI Brand · Pokémon/CoinGecko/Gemini/R2 |

### 5i. 잔액 인식 피드 · 유저별 매치 · 목업 0 (v7.22.21 · 중복0)

| 항목 | SSOT |
|------|------|
| 피드 분류·suggestDeposit | Engine **§0.0.5.1** |
| principal · 입금 딥링크 | Money **§49.2a** |
| 홈 섹션·카피 | UI **§5.3a** · `T.feed.*` |
| 유저별 숨김/핀/마진/수익 | Admin **§9.8.9** · `user-opportunity-override.v1` |
| 시각 SSOT | Canon + Lux + Brand Kit ready **만** · `docs/mockups` **0** · `assets/ai-profit-os-*.png` **0** |
| 검증 | `verify:balance-aware-feed` · `verify:admin-user-opportunity-override` |

### 5k. 매칭 성공 조절 (v7.22.23 · 중복0)

| 항목 | SSOT |
|------|------|
| 엄격도→Rule 맵 | Engine **§48.13.3** |
| Admin UI | UI **§48.6** 「매칭 성공 조절」 |
| 금지 | `successRatePercent` · 난수→MATCH_SUCCESS |
| 검증 | `verify:match-strictness` · `verify:no-success-rate-percent` |

### 5m. 차단 · 쪽지 · 자동 Push · 알림 기본 ON (v7.22.25 · 중복0)

| 항목 | SSOT |
|------|------|
| 유저별 매칭/출금신청 차단 | Admin **§9.8.4a** · Engine P0b · Money §49.3 #1 |
| 1인 쪽지 | Admin **§9.8.8d** · UI **§5.9.4** `/me/inbox` |
| 공지·이벤트·매칭 자동 Push | PWA **§23.5a** · prefs 필터 |
| 가입 알림 기본 | UI **§50.1n** 전부 `true` · OFF=Push만 스킵 |
| 등급 배지 | Brand Kit SVG **B안** · 사진목업/실사 배지 **금지** |
| 검증 | `verify:admin-user-capability-block` · `ops-inbox` · `notification-prefs-default-on` · `push-channel-prefs` · `membership-badge-assets` |

### 5l. 멤버십 · Admin 유저 Ops (v7.22.24 · 중복0)

| 항목 | SSOT |
|------|------|
| 등급·AI해금·일일캡·effectivePolicy | Engine **§0.0.7** |
| 유저 등급표·참고율 카피 | UI **§5.9.2c** · **§51.18a** · Canon `membership-home` |
| 등급·성향메모·밴·로그인비번·출금PIN·프로필전수·유저별엄격도 | Admin **§9.8.10** |
| 「% 조절」 | `matchStrictnessOverride` only · KPI fulfillRate 읽기전용 |
| 출금 PIN wipe | Money **§43.6a** (정책) · Admin UI Owns |
| 금지 | 난수 성공률 · 등급=100%매칭 · PIN 평문 조회 |
| 검증 | `verify:membership-*` · `verify:admin-user-credentials` · `verify:admin-user-ban` · `verify:admin-user-match-override` |

### 5j. 친구초대 ∞ · KR 설명 · Pool (v7.22.22 · 중복0)

| 항목 | SSOT |
|------|------|
| 초대 횟수 ∞ · %/Pool/0원 런칭 | Money **§51.5** |
| 20~70 설명·FAQ·toneBand | UI **§5.9.1a** · Canon `invite-home` |
| Admin | `growth?tab=referral` · 인원캡 UI **0** |
| 스키마 | `referral-program.v1` · `referral-edge.v1` (+queued_pool) |
| 검증 | `verify:referral-unlimited-invites` · `verify:invite-explain-surfaces` · `verify:referral-pool-fifo` |

### 5d. Engine 잠금 (v7.22.14 · 중복0)

| 항목 | SSOT |
|------|------|
| 플랜 파일 | `ai_profit_os_02_engine_b2c3d4e5.plan.md` **단일** (이중본 drift 금지) |
| Phase0 버스 | **in-process** · NATS=Phase1+ (Engine §2.0) |
| v1 실행 | `executionMode=orchestrate` only (ADR-009) |
| 정산 Rule | Engine §48.13 · participate=§48.13.1 · golden=§48.13.2 |
| 마진 공식 | Engine §0.0.4 · 화면=UI |
| 퍼뜩 | Engine §47.12~14 |

### 5b. KR 20~70 유저 SSOT (v7.22.10)

| 항목 | SSOT |
|------|------|
| toneBand young/mid/senior | UI §38.9 · 온보딩 step0 · landing 시드 Infra §31.2 |
| fontScale md/lg/xl | UI §50.1 · Light 테마 금지 |
| 테더 준비 가이드 | UI §38.8 `/me/guide/get-usdt` |
| 입금 네트워크 한글 | Money §41.6 (화면 TRC20 0) |
| 본인 진행 1줄 | UI §50.1b |
| 성별 UI | **분기 금지** · 중성 존댓말 |
| spot-check | UI §38.6b · 표본 **20·40·60~70** 각3 · 남녀혼합·중성 과제 |
| schema | `user-ux-prefs.v1.json` |
| 로드맵 | Index **v7.22.18** §18 ⇄ Milestone 1:1 · Rule=M1 핵 |

### 5c2. 원화 입금 Day-1 (v7.22.12)

| 항목 | SSOT |
|------|------|
| 경로 | 신청 → 운영자 통장 확인 → Admin **[승인]/[거절]** |
| 승인 시 | USDT 잔액 반영 + 유저 토스트/내역 |
| 거절 시 | 잔액 0변화 + 거절 내역·알림 |
| CSV | **Day-1 필수 아님** (L2+) |
| PG사 | 0 |

### 5c. 온보딩·인증·광고·KYC (v7.22.11 · 중복0)

| 항목 | Owns | Pointer |
|------|------|---------|
| 체험형 온보딩 | UI §6.4 + Canon `onboarding-*` | practice §51.7 |
| 로그인/가입 UI | UI §6.4b Canon `auth-*` | Infra §51.9 |
| Stage A/B 필드 | Infra §51.9.1 | withdraw/KYC 게이트 |
| `/ads` alias | Infra §31.2a | `/l/*` canonical |
| 3초 랜딩 예산 | Infra §31.2b + Canon `landing-3s` | CAPI §31 |
| KYC Lux 3면·제출 | Money §42 + Canon `kyc-*` | UI wire only |
| 금지 | RRN 타이핑 · 성별 필드 · `/ads` 이중 페이지 | — |

---

## 6. 어드민 — 톱레벨 12 유지 · 자식 route 전수 (Admin §9.1.1 = Owns)

> **Owns:** Admin 플랜 `ai_profit_os_04_admin_e5f6a7b8.plan.md` **§9.1.1** · 본 절=착수 전 체크리스트 복사.  
> **실물:** `apps/admin` **routes lock 존재**(monorepo-skeleton) — 아래는 **구현 필수 IA** (Admin 본문 추출 · deep 기능=Admin todos).  
> **금지:** sidebar 13번째 · 유저앱에 admin route · 화면 IT용어.

### 6.1 톱레벨 12 + 2b (sidebar)

| # | ko 라벨 | route | 필수 기능(요약) |
|---|---------|-------|----------------|
| 1 | 한눈에 보기 | `/admin` | TOP5 위젯 · 전역검색(user/tx/입금자) |
| 2 | 수익 기회 관리 | `/admin/opportunities` | §36 가격·마진 · `gradeMismatch` 배지 · 일시정지 |
| 2b | 진행 정책 | `/admin/execution-policy` | §48.6 매칭 성공 조절 · Soft/Hard 표시 · 난수성공률 UI **0** |
| 3 | 해외 시세 수집기 | `/admin/adapters` | health · ebay멀티\|admin legs · yahoo **0** · 매칭실패율 KPI |
| 4 | 입출금 관리 | `/admin/wallet` | 입금설정·검수·원화승인/거절·출금·분쟁 |
| 5 | 입출금·정산 장부 | `/admin/ledger` | recon · shadow · `?userId=` |
| 6 | 회원 관리 | `/admin/users` | 유저360 · 금융전수 · 차단·쪽지·멤버십 |
| 7 | 사기·이상 방지 | `/admin/risk` | 동결 큐 · abuse |
| 8 | 법적 확인·제재 | `/admin/compliance` | KYC 큐 · 제재 |
| 9 | 긴급 정지 | `/admin/system-control` | circuit · **pushEnabled kill** |
| 10 | AI 분석 기록 | `/admin/ai-logs` | coach/spotcheck 탭 |
| 11 | 이벤트·프로모션 | `/admin/growth` | **기본 OFF** · 자식 탭만 |
| 12 | 운영 기록 | `/admin/audit` | admin audit |

### 6.2 자식 route / tab (sidebar 추가 금지)

| 자식 | 부모 | 기능 |
|------|------|------|
| `/admin/execution-policy` | 2b | 엄격도·실조건≠연출 · 관측 성공% 읽기전용 |
| `/admin/wallet?tab=deposit-settings` | 4 | §37 원화대표계좌 · TronGrid 설정 |
| `/admin/wallet?tab=review` | 4 | TOP1 검수함 · USDT예외·원화·고액출금 |
| `/admin/wallet?tab=krw-pending` | 4 | 원화 **[승인]/[거절]** Day-1 · CSV=L2+ |
| `/admin/wallet?tab=disputes` | 4 | §51.11 오입금·wrong-chain |
| `/admin/support` (`?tab=queue`) | 1/6 링크 | §51.6 CS 큐 · sidebar 13 금지 |
| `/admin/reports/financial` | 5 하위 | §39 일/월 금융 리포트 |
| `/admin/growth?tab=simulation` | 11 | §51.4 M0.5 · Growth ON 전 필수 |
| `/admin/growth?tab=referral` | 11 | §51.5 Pool·보류·clawback · 인원캡 UI **0** |
| `/admin/growth?tab=notices` | 11 | §51.5b 공지 (보상문구 0) |
| `/admin/growth?tab=campaigns` | 11 | 이벤트/캠페인 |
| `/admin/growth?tab=share` | 11 | 공유카드 템플릿 |
| `/admin/growth?tab=content\|deposit\|whale\|ticker` | 11 | §35 G1~G4 (기본 OFF) |
| `/admin/ai-logs?tab=coach` | 10 | 퍼뜩 P/G/S Eval·trace |
| `/admin/ai-logs?tab=spotcheck` | 10 | §38.6b 이용성 점검 |
| `/admin/users/:id` | 6 | §9.8.8 유저360 |
| `/admin/users/:id/finance` | 6 | §39 순유입·입출금·시세차익 |
| `/admin/users/:id/finance?tab=buckets` | 6 | §49/§51.7 practice |
| 유저 상세 내 §9.8.4a/8d/9/10 | 6 | 매칭·출금차단 · 쪽지 · 기회override · 멤버십·PIN·엄격도 |
| `/admin/risk?tab=queue` | 7 | TOP3 동결 큐 |
| `/admin/adapters` KPI | 3 | §51.15/19 · listing legs 가드 |

### 6b. 유저360 KPI 잠금 (v7.22.13 · 중복0)

| KPI | 공식 | Owns |
|-----|------|------|
| 총 입금 / 총 출금 | ledger 집계 | Admin §9.8.7 |
| **순유입** | 총입금 − 총출금 | Admin §9.8.7 |
| 시세차익 순수익 | settlement 유저 몫 | Admin §9.8.7 |
| 추천·유입·CS | 표시만 | Money §51.5 · Infra §31 · §51.6 |

---

## 7. 에이전트 모델 배정 (todo 작업 기준)

| 모델 | Context | 배정 |
|------|---------|------|
| **grok-4.5** | 256K | 헌법·스키마·원장불변식·퍼뜩(AI) 아키텍처·어드민 IA·크로스도메인 SSOT·게이트 설계 |
| **composer-2.5** | 200K | SSOT 확정 후 **단일 도메인 슬라이스** 구현 (한 화면·한 워커·한 모듈) |

규칙: 한 todo = 한 모델 · 한 도메인 플랜 · verify:* + `cleanup:lowspec` 까지가 done.

---

## 8. Phase0 버스·인프라 (모순 해소)

| 항목 | SSOT |
|------|------|
| Event bus | Phase0 = **in-process** · NATS/Temporal **0** |
| DB/Redis | **원격** Supabase + Upstash · Docker Desktop **기본 OFF** (8GB) |
| Compose PG17/Redis | **옵션** (RAM 여유 시) · 필수 아님 |
| Host | Cloudflare only · Vercel 금지 |
| 동시 기동 | `web` **또는** `api` 1개 |

어드민/문서의 `NATS *.updated` 표기는 **Phase1+** 또는 Phase0 in-process 동등 이벤트로 해석 · UI에 NATS 문자열 **노출 0**.

---

## 9. 착수 체크리스트 (v7.23 R0)

- [x] 이 문서 재스캔 · Index **v7.22.36 CLOSE** 흡수 (DB41·migrations10·pgvector ON·헌법29·스키마38 · apps web+admin · Auth+Phase0 PASS)
- [x] `CONSTITUTION/` §2 목록 파일 존재 (constitution-28*)
- [x] `schemas/` Day-1 계약 존재 (schemas-contracts-core)
- [x] `supabase/migrations/` 초기 + 원격 apply · `vector` extension 포함
- [x] pnpm verify:stack-lock PASS (Index CLOSE 재검증)
- [x] pnpm verify:brand-consumer PASS
- [x] Admin IA 골격 = §6.1~6.2 / Admin §9.1.1 (`apps/admin/routes` lock · monorepo-skeleton completed)
- [ ] `DATABASE_URL` · `REDIS_URL` 로컬 `.env` (git 0)
- [x] Index R0 4게이트 live · observation registry 등록(가상규칙0·materialize0 at R0)
- [x] 01 Money `redesign-r1-money-read-contract` completed
- [x] post-r0 Money observation promote wave1 (`cc.money.r0-obs-promote-wave1`) · todo materialize 3 · Engine obs observed 유지
- [x] post-r0 Money remediation 3todo completed (idempotency·durability·A+B)
- [x] 02 Engine `engine-ebay-identity-match-ingest` CLOSED (live Browse+DB ebay provenance)
- [x] 02 Engine `redesign-r1-home-fact-state-contract` CLOSED (HomeReadModelV1 · verify home-state-truth/no-fake-zero)
- [x] 02 Engine `reference-resolution` CLOSED (resultRef resolver · getExecution ownership · preference append)
- [x] 02 Engine `routing-coverage` CLOSED (wallet/EXECUTION_PATTERNS→P · getExecution tools_called)
- [x] 02 Engine `scope-guard` CLOSED (OFF_TOPIC→scope_redirect · meta residual · eval§H)
- [x] 02 Engine `numeric-grounding` CLOSED (date-aware grounding · ungrounded→fact fallback · verify:numeric-grounding)
- [x] 02 Engine `shadow-replay-naming` CLOSED (ADVISORY_LABEL additive · FAIL_ACTION 불변 · verify:shadow-replay-drift)
- [ ] 한 채팅=다음 **03 UI** `redesign-r1-home-truth-preflight` only · Money/R0/Engine hardening completed 재실행 금지

**done 정의:** 해당 todo의 `verify:*` PASS + `pnpm cleanup:lowspec` PASS.

---

## 9.1 착수 순서 잠금 (v7.23 · Index File-Serial · 건너뛰기 금지)

> **Owns:** 본 절 + Index「플랜 직렬 완료 규칙」.  
> **운영자(Grok-4.5) 규칙:** YAML pending todo를 **위에서 아래로만** · 한 채팅=한 todo · 완료 잠금 todo 재실행 금지.  
> **다음 채팅:** **03 UI** `redesign-r1-home-truth-preflight` only · Money/R0/Engine hardening completed 재실행 금지 · Engine obs promote는 별도 PO 트랙.

| 순 | Index todo | 산출물 | 모델 | 상태 |
|----|------------|--------|------|------|
| 0 | 게이트 | `verify:stack-lock` · `verify:brand-consumer` | — | Index CLOSE 재확인 |
| 1 | `constitution-28-core` | `CONSTITUTION/` 14·17·20·22~28·35~46b | grok-4.5 | completed |
| 2 | `constitution-28-ai-money-ops` | `CONSTITUTION/` 47~51·51r | grok-4.5 | completed |
| 3 | `schemas-contracts-core` | `schemas/` Day-1 JSON | grok-4.5 | completed |
| 4 | `schemas-migrations-supabase` | migrations 9→(+auth=10) · Seoul apply · pgvector ON · public 38→41 | grok-4.5 | completed |
| 5 | `monorepo-skeleton` | apps/web·admin · services · packages · **Admin routes=§9.1.1** | composer-2.5 | completed |
| 6 | `copy-canon-cta-sla-lock` | copy/ko CTA·면책·Soft/Hard + Canon `primaryCta` | grok-4.5 | completed |
| 7 | `auth-ssot` | Nest JWT · Stage A/B · Owns=Infra §51.9 · `verify:auth-flows` | grok-4.5 | completed |
| 8 | `phase0-bootstrap-hosts` | OpenNext Workers+Supabase+Upstash · Owns=Infra §51.13 · `verify:phase0-bootstrap` | composer-2.5 | completed |
| 9 | R0 4 todo | baseline→fact/state→change-control→observation · 4 verify live | grok-4.5 | **completed** |
| 10+ | 도메인 파일 | 01 R1 → 02 R1 → 03 R1~R5 → 04 R6 → 05 PWA → 06 R7/R8 | 접두사 | File-Serial · **다음=01 Money** |

**금지:** 헌법/스키마 없이 apps 화면 · constitution∥monorepo 병렬 · Dashboard DDL · Supabase Auth SDK · launch를 착수 SSOT로 사용 · Day-1 yahoo INSERT/leg 코드 · R0 재실행 · Admin `admin-isolated-deploy`를 `admin-ops`보다 먼저 실행.

### 0.6 UI 착수 전 실측 (v7.22.46 골격 · **v7.22.50 PASS** · `ui-preflight-constitution`)

> **Owns:** UI 플랜 §0.6 = v7.22 상세 이력 · `market-partner-trust-surfaces`→PART9→`trust-age-spotcheck` 포인터는 v7.23 R0가 supersede.
> **방법(2026-08-10):** Supabase MCP `list_tables` + 레포 FS(CONSTITUTION 29·Canon 28·lux-fintech·ebay-adapter gap) + Money/Engine YAML + CATALOG  
> **선행(v7.22.49 충족 · 재확인):** 01 Money `money-user-benefits-read` **completed** + 02 Engine Pre-UI Gate(E-R1~E-R8) **pending 0**

| 대상 | 실측 (2026-08-10 CLOSE) | UI 함의 |
|------|------|--------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG **17.6** · ACTIVE_HEALTHY | 원격 only |
| `public` 테이블 | **76** · RLS ON (MCP 재실측) | mission/growth/execution/ai 포함 |
| migrations | **28** 로컬 SQL · 끝=`20260809144814_catalog_runtime_day1_fx_bootstrap`(v7.22.52 UI §0.8.2 #1에서 파일명버전 drift `144409`→`144814` rename 해소) | UI DDL 0 |
| public 함수 | **5** (+`user_opportunity_overrides_pin_cap`) · §0.5.1 | Nest API only |
| Gate MCP | `execution_policies` rows**1** · `opportunities` rows**6** · `assets`**94** · `listings`**12** | UI 배선 대상 존재 |
| Brand markets | *(CLOSE 시점 0 → §0.6.4에서 재실측 갱신)* | §38.10 PART1a |
| Canon | *(CLOSE 시점 `market-partner-trust.wire.json` 0 → §0.6.4 갱신)* | PART1a |
| `apps/web/routes.ts` | *(CLOSE 시점 partners/benefits 0 → §0.6.4 갱신)* | PART1a/5b/7b |
| Admin routes | missions/partners/ticker/coach/spotcheck **잠금** · deep 페이지 일부 0 | Admin PART5 todos |
| Engine feed/participate/execute | CATALOG **live** · FS controllers 존재 | PART3~4 배선 허용 |
| Engine ai-coach-runtime | **completed** | UI ai-coach-ui 선행 충족 |
| Kakao OAuth | founder .env · Infra runtime **pending** | auth UI 가드 |
| CLIME / 사진목업 PNG | repo **0** / ADR-013 금지 경로 **0** | mockup-governance 유지 |
| U13 색토큰 | v7.22 dark token 이력 · v7.23 ADR-017=`#F6F4FC`/`#6B3CFF`/`#12B76A` | superseded |
| U14 realtime | `services/realtime-service` **0** · Phase0=`execute-tick` polling | §29.6=Phase1+ only |
| U15 eBay gap | `assetId: query:*` → persist drop · matchers 미배선 | Engine todo `engine-ebay-identity-match-ingest` · v7.22 예외2→v7.23 R1 blocking · UI ProductImage only |

#### 0.6.1 흡수 모순 (UI/Admin · 완료 · 구현 0)

| # | 발견 | 해소 |
|---|------|------|
| U1 | 구 todo `yahoo-jp-copy-ban` vs §38.10 표기필수 | → `market-partner-trust-surfaces` · adapter금지≠표기 |
| U2 | UI·Admin §48.6 이중 Owns | → Admin `admin-execution-policy` only |
| U3 | composer mega todo | → Grok 256K PART0~8 |
| U4 | Admin missions/partners/G4/coach todo 공백 | → Admin YAML 4 todo 추가 |
| U5 | BOOTSTRAP 다음 todo stale | → `ui-preflight-constitution`(본 CLOSE로 해소) |
| U13 | §6.2/§33.1 hex ≠ `lux-fintech.ts` | → plan 표=코드 미러 · 구 neon 표 폐기 |
| U14 | §29.6이 realtime-service Phase0 가정 | → Phase1+ 인터페이스 · Phase0=polling 훅 |
| U15 | eBay 실사진 DB 미도달 미기록 | → Engine YAML `engine-ebay-identity-match-ingest` + §0.10 · v7.22 예외2 이력 · v7.23 R1 선행 |

**판정:** Pre-UI Runtime Gate **CLOSED** · `ui-preflight-constitution` = **PASS (v7.22.50)** · PART0~8c+PART9 **CLOSED (v7.22.59)**.
**v7.22 당시 다음:** **03 UI** `trust-age-spotcheck`. **v7.23 현재:** 01 Money `redesign-r1-money-read-contract`.

#### 0.6.3 UI 플랜 종합 실물 재검증 (v7.22.52 · pointer only · 상세=UI §0.8)

> **발생:** 유저 요청형 "DB·마이그레이션·함수·SQL·테이블·엔진·Supabase·폴더·기술스택·파일·헌법·기술코드 전수 확인" 감사를 `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` **§0.8**에 상세 기록(중복 방지를 위해 본문은 여기 복제하지 않음).  
> **해소 5건:** (1) `supabase/migrations` 파일명 버전 drift(`144409`→`144814`) 즉시 rename + `tooling/verify/catalog-runtime-seed.cjs` 하드코딩 경로 동반 수정(재검증 PASS 확인) (2) `verify:benefit-hub-surfaces`="live" 표기의 딥 UI 미검증 범위 명문화 (3) 고아 검증 `verify:margin-compare-surface` 신설요건 기록 (4) Engine §51.20 Weekly Market Briefing 고아 게이트를 UI §51.20으로 Owns 흡수 + PART8b 범위 확장 (5) PART1~8 다수가 YAML `pending`인데 레포엔 우량 구현체 다수 존재 — PART별 실측 착수가이드 신설.  
> **판정(이력 · v7.22.52):** 당시 다음=`market-partner-trust-surfaces`→PART1a~9→`trust-age-spotcheck`; v7.23 R0가 현재 포인터를 supersede.

#### 0.6.4 착수 직전 재확인 (2026-08-10 · PART1a GO · **이력** · 구현코드 0)

> **Owns(이력):** 당시 `market-partner-trust-surfaces` 채팅 직전 File-Serial/게이트/실물 재확인 · **PART0 재실행 금지** · todo status 변경 0.  
> **v7.22.59 당시 다음:** `trust-age-spotcheck` — 아래 §0.6.5.
> **방법:** Supabase MCP `list_projects`/`list_migrations`/`execute_sql` + 레포 FS + `pnpm verify:stack-lock`/`plans-ssot`/`market-partner-trust`/`brand-logo-single`/`brand-assets`/`mockup-governance`/`canon-surfaces` + `pnpm cursor:sync-plans`.

| 게이트 | 실측 | 판정 |
|--------|------|------|
| 00 Index | pending **0** · CLOSED | ✅ |
| 01 Money | 16/16 completed · `money-user-benefits-read` **completed** | ✅ |
| 02 Engine Pre-UI | E-R1~E-R8 **completed** · Gate **CLOSED** | ✅ |
| 02 Engine 가산 | hardening 6todo **CLOSED** · pending **0** · §47.16.8 CI green 잔여 · 다음 파일=03 UI `redesign-r1-home-truth-preflight` | ✅/🔄 |
| 03 UI PART0 | `ui-preflight-constitution` **completed** | ✅ |
| Supabase | ACTIVE_HEALTHY · Seoul · PG **17.6** · ref=`mgsytcetsiecllmhcyox` | ✅ |
| migrations | 원격 **28** = 로컬 **28** · 끝=`20260809144814_catalog_runtime_day1_fx_bootstrap` | ✅ 1:1 |
| `public` 테이블 / 함수 | **76** / **5** | ✅ |
| Gate 행 | `execution_policies` **1** · `opportunities` available **3** (total **6**) | ✅ |
| plans-ssot · stack-lock | **PASS** · sync already=8 | ✅ |
| Brand markets scaffold | `assets/markets/{manifest,README}` + `brand/markets.ts` + MarketPartner{Grid,Leg,Strip} + Canon wire + `/me/guide/partners` + routes 잠금 | ✅ 실물 |
| 7 partner SVG | 디스크 **0** · manifest `status=blocked` ×7 · `blockingSubDeliverable=blocked` | ⚠️ PART1a 갭-only |
| verify:market-partner-trust | **PASS (scaffold)** · BLOCKER line = 7 SVGs | ✅ 착수 가이드와 일치 |
| verify:brand-* / mockup / canon | **PASS** (market logos blocked=7/7 tracked · wires checklist) | ✅ |
| CLIME / 사진목업 PNG | **0** | ✅ ADR-013 |
| Docker | OFF · DB=remote only | ✅ Phase0 RAM |

**판정(이력 · PART1a GO):** 당시 GO=`market-partner-trust-surfaces`, 이후 PART1a~9 CLOSED. v7.23 현재 실행 큐는 문서 최상단 R0다.

#### 0.6.5 PART9 CLOSE · 당시 다음=spotcheck (v7.22.59 이력)

> **Owns:** Index A12 + UI overview + 본 절 「다음」일치 · **PART0~9 재실행 금지** · 8d=수동실사(코드0).  
> **v7.22 GO:** 03 UI `trust-age-spotcheck` only. v7.23에서는 R1 Home 구현 뒤 같은 실사를 수행한다.

| 게이트 | 실측/잠금 | 판정 |
|--------|-----------|------|
| 00 Index | CLOSED · overview/A12=`trust-age-spotcheck` | ✅ |
| 01 Money / 02 Engine Pre-UI | 기존 completed 불변 · v7.23 R1 가산 pending 별도 | 🔄 |
| 03 UI PART0~8c | YAML **completed** | ✅ |
| 03 UI PART9 | 9-pre~9i **completed** · verify T0 | ✅ |
| 03 UI 잔여 | `trust-age-spotcheck` only | ✅ 실행 큐 |
| Admin/PWA/Infra | 03 pending>0 동안 deep 착수 **금지** | ✅ File-Serial |

**판정:** PART9 메타 PASS(불변) · 당시 다음=`trust-age-spotcheck`; 현재 다음=01 Money `redesign-r1-money-read-contract`.

### 0.7 종합 실물 감사 (v7.22.49 · 2026-08-09 · 유저 요청 전수 스캔 · 예측0)

> **Owns:** 유저 요청형 "DB·마이그레이션·함수·SQL·테이블·엔진·Supabase·폴더·기술스택·파일·헌법·기술코드 전수 확인" 감사 기록. **File-Serial·todo 상태 변경 0** — 발견된 드리프트/하드닝 결함만 최소 diff로 즉시 해소.  
> **방법:** Supabase MCP(`list_tables`/`list_migrations`/`list_extensions`/`get_advisors`/`execute_sql`) 전수 + 레포 FS(`CONSTITUTION/`29·`schemas/`·`supabase/migrations/`·`apps/`·`services/`·`workers/`·`packages/`·`tooling/verify/`) + `verify:*` **85개 개별 실행**(`next-build`/`opennext-build` 제외 — 실행 당시 `lowspec:status` 여유 RAM <1.5GB(0.43GB) 확인 후 안전상 스킵) + `cargo check`(engine-rust) + `tsc -p services/api-nest`.

| 대상 | 실측 | 판정 |
|------|------|------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG 17.6 · ACTIVE_HEALTHY | ✅ |
| `public` 테이블 | **76** (v7.22.44 CLOSE와 동일 개수 · row만 진행: `execution_policies`=1·`mission_definitions`=2 등) | ✅ 드리프트 0 |
| migrations applied | **27** · 로컬 파일명 버전 = 원격 **1:1 재정렬 완료**(결함#2) | ✅ |
| public 함수 | **5** · **전수 `search_path=public` 고정 완료**(결함#3) | ✅ |
| advisors(security) | ERROR **0** · WARN **0** · INFO=`rls_enabled_no_policy`(Day-1 deny-by-default 의도)만 잔존 | ✅ |
| `verify:*` (85/85 · gate17+stubs60+개별8) | 전수 **PASS** | ✅ |
| `cargo check`(engine-rust) | PASS (의존성 0 · 2.4s) | ✅ |
| `tsc -p services/api-nest` | PASS (에러 0) | ✅ |
| File-Serial 실제 위치(감사 당시) | `market-partner-trust-surfaces`→v7.22.59 `trust-age-spotcheck` | 이력 |

#### 0.7.1 결함 → 해소 (실행코드·정책·SSOT 문구 무변경 · 순수 드리프트/하드닝만)

| # | 발견 | 원인 | 해소 |
|---|------|------|------|
| 1 | `.cursorignore`: `docs/`를 완전 제외한 뒤 `!docs/CONSTITUTION_BOOTSTRAP.md`로 예외 처리 시도 — **gitignore는 부모 디렉터리가 완전 제외되면 자식 negation을 적용하지 않음**(git 공식 동작) → 본 파일이 Read/Grep 도구에서 상시 `Permission denied`. AGENTS.md가 "착수 전 필독"으로 못박은 바로 그 파일이 에이전트 도구로는 열리지 않던 상태였음(Shell 우회로만 가능) | gitignore negation-after-parent-exclude 한계 미인지 | `docs/` → **`docs/*`**(직계 자식 단위 매칭이라 negation 정상 작동) · `CONSTITUTION/`·`docs/mockups/` 등 나머지 의도적 차단은 **불변** |
| 2 | 신규 migration `execution_policy_day1_bootstrap` — 로컬 파일명 타임스탬프(`20260809142006`)가 `apply_migration` MCP 실제 부여 버전(`20260809142108`)과 **102초 drift** → "로컬 파일명 버전=원격 1:1" 불변식(§3.2·§9) 위반 | 파일 먼저 작성 후 별도 MCP apply로 두 타임스탬프가 독립 생성 | 로컬 파일명을 원격 실버전으로 **rename**(SQL 내용 무변경) |
| 3 | `public.user_opportunity_overrides_pin_cap()` — Supabase 보안 어드바이저 `function_search_path_mutable` **WARN**. 동일 계열 5개 함수 중 4개(`ledger_forbid_mutation`·`ledger_require_posting_flag`·`provision_user_bucket_accounts`·`users_stage_a_identity_ok`)는 `search_path=public` 고정 · 이 함수만 누락 | `user_opportunity_overrides_schema_align`(20260809023713) 작성 시 컨벤션 누락 | 신규 migration `user_opportunity_overrides_pin_cap_search_path`(`20260809143754`)로 `ALTER FUNCTION … SET search_path = public` · 동작 변경 0 · advisor 재조회로 WARN 0 확인 |

**판정:** 헌법·스키마·DB·verify 게이트 = **PASS**(위 3건은 발견 즉시 해소된 드리프트/하드닝). Pre-UI Gate = **CLOSED (v7.22.49)**. UI PART0~8c+PART9 = **CLOSED (v7.22.59)**.  
**v7.22.59 당시 다음:** 03 UI `trust-age-spotcheck`. **v7.23 현재:** 01 Money `redesign-r1-money-read-contract`.

