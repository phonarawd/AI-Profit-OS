# verify:* Catalog (ADR-016 · §19 pointer)

로컬(얇은 게이트) vs CI(두꺼운 게이트).

## Local `pnpm verify:gate` (commit/push 전 · 필수)

| id | 스크립트 | 상태 |
|----|----------|------|
| stack-lock | `verify:stack-lock` | ✅ live |
| secrets | `verify:secrets` | ✅ live |
| pg-module-scan | `verify:pg-module-scan` | ✅ live |
| brand-consumer | `verify:brand-consumer` | ✅ live |
| brand-assets | `verify:brand-assets` | ✅ live (visual_kit_v1) |
| cf-infra | `verify:cf-infra` | ✅ live |
| workers-types | `verify:workers-types` | ✅ live (@cloudflare/workers-types · workers/tsconfig.base.json · pnpm install) |
| phase0-bootstrap | `verify:phase0-bootstrap` | ✅ live (§51.13 · CF+Supabase Seoul+Upstash · Compose optional · NATS/Temporal/EKS 0) |
| root-domain-env | `verify:root-domain-env` | ✅ live |
| next-major-pin | `verify:next-major-pin` | ✅ live (next@16) |
| tailwind-v4 | `verify:tailwind-v4` | ✅ live (Tailwind v4 · @tailwindcss/postcss · lux-theme @source · Pretendard) |
| lux-theme-sync | `verify:lux-theme-sync` | ✅ live (lux-fintech ↔ lux-theme hex/radius mirror) |
| cf-deploy-packages | `verify:cf-deploy-packages` | ✅ live (@aipo/* · build:cf · OpenNext) |
| next-build | `verify:next-build` | ✅ live (web + admin `next build`) |
| opennext-build | `verify:opennext-build` | ✅ live (build:cf · `.open-next/cloudflare` · Windows=SKIP · CI ubuntu=full) |
| no-admin-in-web | `verify:no-admin-in-web` | ✅ live (§40) |
| ia-tabs | `verify:ia-tabs` | ✅ live (User 5탭) |
| admin-routes | `verify:admin-routes` | ✅ live (Admin §9.1.1) |
| plans-ssot | `verify:plans-ssot` | ✅ live (workspace `.cursor/plans` ↔ `%USERPROFILE%\.cursor\plans` hash) |

## Domain gates (구현되면 hard · 현재 stub PASS + TODO)

| id | 도메인 |
|----|--------|
| bucket-invariant · withdraw-mode-default · principal-withdraw-reachable · principal-profit-abuse · balance-aware-feed · practice-non-withdrawable | Money §49/§51.7 — **live** (posting·ASC FOR UPDATE·idempotency·provision·recon · default mode=profit · 원금 CTA·시트·3CTA · Admin finance?tab=buckets · §49.9 P1~P24/E1~E12 risk queue·freeze·circuit · §49.2a suggest deeplink·principal Fact·Engine pointer · practice welcome 1회·7d expire·Banner·403) |
| withdraw-fee-ledger · min-holding-scope | Money §11.1/§11.2 — **live** (deposit-config fee/minHolding · FEE_REVENUE · profit-only exempt) |
| match-success-rule · simulation-gate | Engine §48/§51 — match-success-rule **live** · simulation-gate **live** (M0.5 S1~S4 · platform_reserve · Growth ON ≤24h · Admin growth?tab=simulation · system-control?tab=reserve) |
| ai-feature-platform · shadow-replay-drift · no-success-rate-as-rule · no-ai-data-in-git | Engine ai-feature-platform — feature-platform + ai-platform L1/L2 · AI PICK · AI_LOG/Eval · L3 money0 · shadow-replay drift **0.000%** · sellSuccessRate≠Rule/PICK · GitHub AI data0 — **live** |
| twin-fact-separation | Engine §47 Personal AI — Twin≠money Fact · Memory+pgvector · Fact freshness · Answer Guard · P/G/S router — **live** |
| no-it-jargon · toast-emoji · korean-ui | UI §50 |
| age-tone-surfaces · font-scale-three · deposit-network-plain-ko | UI §38.9·§50.1 · Money §41.6 — **deposit-network-plain-ko live** (트론 경고 · TRC20 유저0 · wrong-chain→CS+disputes) (v7.22.10) |
| onboarding-experiential · auth-surfaces · landing-3s · kyc-surfaces | UI §6.4~6.4d · Infra §31.2a/b · Money §42 (v7.22.11) |
| auth-flows | Infra §51.9+§51.9.1 — Nest JWT only · Stage A/B · OAuth/Passkey · session · 탈퇴 · **live** |
| ai-coach-fact-only · ai-coach-no-autonomy | Engine §47.12~15 — **P레인** Fact-only · 전레인 자율집행 0 · FactToolService+CoachOrchestrator+SSE — **live** |
| ai-general-no-money-tools · ai-lane-router · llm-adapter-contract | Engine §47.8·47.13~15 — G tools=[] · P/G/S router · **live** |
| llm-quota-degrade | Engine §47.13 — 429→G busy·P Fact · 자동 failover 0 · toast `PEOTTEOK_LLM_BUSY` — **live** |
| fact-freshness · answer-trace | Engine §47.4·47.5·47.15 — stale Fact refresh · lane+trace 100% · **live** |
| pwa-manifest · pwa-serwist-single · pwa-brand-icons | PWA §23.1·25·26 — 퍼뜩·Lux theme · SW 1곳 · Brand icons (v7.22.17) |
| push-dedup · pwa-phase0-bus | PWA §23.5 — source_event_id · Phase0 NATS 0 |
| webauthn-fallback-pointer · email-provider-resend | Money §43.6 Owns · PWA §23.6 UX only · Resend SSOT — **live** |
| lighthouse-pwa | PWA §26 — CI ≥90 · local 8GB stub OK |
| mockup-governance · canon-surfaces · brand-assets | UI ADR-013/011 |
| asset-image-surface · execution-surfaces | Engine §0.0.6 · UI §48.3a — category thumb · `시세 불러오는 중...` (v7.22.20) — **asset-image-surface live** (hydrate·SKU1:1·공개가드·R2·Admin tab=assets · Canon4면) · execution-surfaces=UI todo |
| trading-card-vertical | Engine §0.0 / §51.12 — trading_card 시드20~40 · pokemontcg/ygoprodeck 메타 · ebay 호가 · 등급매칭 · 소액 SKU · Admin gradeMismatch 배지 — **live** |
| luxury-bag-vertical | Engine §0.0 — luxury_bag 시드10~25 · Asset Master admin_r2 이미지 · ebay 멀티\|admin 호가 · brand+model 매칭 · 필터칩 `가방` — **live** |
| ultra-watch-whale | Engine §0.0 — watch 시드40~80 · PP/AP/Rolex · whale≥100k Ultra 경로 · Day-1 카탈로그 소액공존(≥40%) · brand+reference 매칭 · 필터칩 `시계` — **live** |
| balance-aware-feed | Engine §0.0.5.1 · Money §49.2a · UI §5.3a — **live** (Engine classify affordable/nearMiss/lockedHigh · suggestDeposit ceil_to_tick · nearMissCap=`execution-policy.feed.nearMissCapUsdt` · override hide 100% · Money suggest query·principal Fact·deposit prefill·feed invalidate) |
| admin-user-opportunity-override | Admin §9.8.9 — 유저별 숨김/핀/마진 · ledger 불변 (v7.22.21) — **live** (DDL↔schema forceShow/pinOrder/marginPct/expectedProfit · Nest CRUD · merge · RBAC) |
| referral-unlimited-invites · referral-pool-fifo · referral-ledger · referral-ladder · referral-idempotency · share-copy | Money §51.5 — **live** 월간초대캡0 · Pool FIFO · clawback · 0원 rewardsEnabled · Admin growth?tab=referral · UI§5.9.1a pointer (v7.22.22) |
| invite-explain-surfaces | UI §5.9.1a — KR 20~70 설명·noCap·Canon invite-home (v7.22.22) |
| match-strictness · no-success-rate-percent | Engine §48.13.3 · UI §48.6 — 엄격도 조절 · 난수 성공률 0 (v7.22.23) — **live** (preset→policy 맵 스냅샷 · Soft60/Hard90 · Admin GET/PUT `/api/v1/admin/execution-policy` + stats/today readOnly · goldens tight/lenient · successRatePercent 0) |
| membership-ladder · membership-daily-cap · no-fulfill-rate-as-rule | Engine §0.0.7 — 등급·일일캡 · fulfillRate≠Rule (v7.22.24) — **live** (ladder snapshot · 승급 max(입금,성공)·adminForce · overlay merge · participate 가드 · Admin `/users/:id` membership·match-policy · fulfillRate 표시전용) |
| membership-surfaces | UI §5.9.2c · Canon membership-home — 100%보장0 · 고액희소 (v7.22.24) |
| admin-user-credentials · admin-user-ban · admin-user-match-override | Admin §9.8.10 — 비번/PIN·밴·유저별엄격도 (v7.22.24) |
| admin-user-capability-block | Admin §9.8.4a — 매칭/출금신청 개별차단 (v7.22.25) |
| ops-inbox · notification-prefs-default-on | UI §5.9.4·§50.1n — 쪽지함 · 가입알림전부ON (v7.22.25) |
| push-channel-prefs | PWA §23.5a — notice/campaign/opp/ops prefs 필터 (v7.22.25) |
| membership-badge-assets | UI §5.9.2c — Brand membership SVG 5종 · 사진목업0 (v7.22.25) |
| opportunity-scan-surface · arbitrage-type-label | UI §5.3b · Engine §4.2a — 홈기회스캔·타입뱃지 (v7.22.26) · arbitrage-type-label=**live** |
| cta-earn-profit · user-trader-jargon-0 | Index §20.2 · UI §48 · Engine §4.2b — 유저 CTA=`수익 벌기` · domain=`participate` · `이 상품으로…`/구매/판매/유저메인`매칭 참여`/판매성공률/executionPlatforms·expectedSellDays 유저0 · 대기Fact 소스가드 · INTERNAL↔USER 맵 · 면책+배지 (v7.22.28) · 구명 `cta-match-participate`=alias · **both live** |
| soft-hard-requeue-sla | Index §20.2 · Engine §48.13 · UI §48 — Soft60/Hard90 · `MATCH_TIMEOUT` · 카피3줄(보통1분/다시맞추는중/시간지나안전정지) · presentation≠SLA (v7.22.29) · Audit A4 · **copy/Canon live** |
| match-tension-surface | Index §20.2 · UI §48.3b — Soft/Hard전등급동일 · 긴장감=과정Fact · 등급≠대기특권 · slaAlmost/priceNearMiss · 난수틱·가짜대기·당첨게이지0 (v7.22.30) · Audit A6 · **copy/Canon live** |
| listing-legs-day1 | Engine §0.0.1a/§0.0.2 — ebay 멀티marketplace\|admin only · yahoo_jp 영구FORBIDDEN · 야후/Yahoo카피0 · KR/Chrono24대체0 (v7.22.32) — **live** — **live** |
| signup-ready-adapters | Engine §0.0 — ebay 멀티marketplaceId · pokemontcg+ygoprodeck · coingecko+frankfurter · yahoo-jp경로0 · Phase1 deploy (phase0 0) · Admin `/admin/adapters` health — **live** |
| adapter-matching-kpi | Engine §51.12+§51.15 — 등급매칭·SKU실패율 KPI(>15%/24h 알림·자동공개축소) · compareReady false>40% 시드점검 · stale>TTL 적색 · Admin `/admin/adapters` KPI·알림 · yahoo0 · Simulation S4 `adapterMatchFailureRate` 선행 — **live** |
| kyc-withdraw-only · kyc-redirect · kyc-r2-only | Money §42 — **live** (출금1회게이트 · toast→/me/kyc@800ms · R2 kyc-docs private) |
| krw-admin-decide | Money §41.3·§43.3 — **live** approve credit1 / reject0 · TRC20 address · PG사0 · CSV=L2+ (v7.22.12) |
| deposit-confirm-stages · no-per-address-poll | Money §41·§43.1 — **live** 1conf UI/no ledger · 19conf deposit_usdt · single stream · Phase0 in-process · Phase1 deploy |
| sweeper-trx-guard | Money §43.2 — **live** Energy+TRX min→sweep 0 · Admin deposit-settings pause · Phase0 in-process ≠NATS |
| admin-user-360 | Admin §9.8.7·§9.8.8 — netInflowUsdt · 유저360 탭 · notify audit (v7.22.13) |
| match-success-rule | Engine §48.13.2 golden 6 · Soft60/Hard90 · REQUEUE/MATCH_TIMEOUT · P0b · random/timer 0 · presentation≠credit (v7.22.14) — **live** |
| pricing-formula · fx-snapshot-formula · market-intel-engine | Engine §0.0 / §0.0.4.1~4.2 — Asset Master·pipeline·FORBIDDEN0 · Admin opportunities §36 · yahoo_jp0 — **live** |
| capital-tier-catalog | Engine §0.0.5 — capitalBand enum·시드≥40%소액·필터칩·CONSTITUTION/46 · Admin opportunities 밴드필터 — **live** |
| referral-ledger · notice-campaign-split | Money/Marketing |
| loop-psychology · day-pulse-live-only · preflight-may-stop | UI **§51.24** DayPulse·PreCTA·L1~L24 (v7.22.15 Owns 복원) |
| ticker-mode-audit · ticker-pii-0 · ticker-organic-hybrid | Admin §35.4 Organic Hybrid G4 · UI §33.2a |
| market-partner-trust · market-partner-adapters | UI **§38.10** 공식협력 로고 · Engine **§0.0.1c** amazon/yahoo adapter Phase1+ (v7.22.41 Founder lock) — market-partner-adapters **live** · market-partner-trust=UI todo |
| mission-auto-payout · mission-idempotency · mission-no-manual-grant · benefit-hub-surfaces · benefit-no-credits-currency · benefit-g4-ledger-separation | Money **§51.8a** · UI **§5.9.5** · Engine **§48.13.4** fanout0 · Admin **§35.7** (v7.22.42) — **live** SSOT |
| peotteok-chat · auth-complete-profile (canon) | UI §6.4b/e · canon-surfaces |

Stub = `tooling/verify/stubs/*.cjs` — 해당 코드 경로가 생기면 FAIL로 승격.
