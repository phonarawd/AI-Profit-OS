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
| phase0-bootstrap | `verify:phase0-bootstrap` | ✅ live (§51.13 · CF+Supabase Seoul+Upstash · Compose optional · NATS/Temporal/EKS 0) |
| root-domain-env | `verify:root-domain-env` | ✅ live |
| next-major-pin | `verify:next-major-pin` | ✅ live (next@16) |
| no-admin-in-web | `verify:no-admin-in-web` | ✅ live (§40) |
| ia-tabs | `verify:ia-tabs` | ✅ live (User 5탭) |
| admin-routes | `verify:admin-routes` | ✅ live (Admin §9.1.1) |
| plans-ssot | `verify:plans-ssot` | ✅ live (workspace `.cursor/plans` ↔ `%USERPROFILE%\.cursor\plans` hash) |

## Domain gates (구현되면 hard · 현재 stub PASS + TODO)

| id | 도메인 |
|----|--------|
| bucket-invariant · withdraw-mode-default | Money §49 |
| match-success-rule · simulation-gate | Engine §48/§51 |
| no-it-jargon · toast-emoji · korean-ui | UI §50 |
| age-tone-surfaces · font-scale-three · deposit-network-plain-ko | UI §38.9·§50.1 · Money §41.6 (v7.22.10) |
| onboarding-experiential · auth-surfaces · landing-3s · kyc-surfaces | UI §6.4~6.4d · Infra §31.2a/b · Money §42 (v7.22.11) |
| auth-flows | Infra §51.9+§51.9.1 — Nest JWT only · Stage A/B · OAuth/Passkey · session · 탈퇴 · **live** |
| ai-coach-fact-only · ai-coach-no-autonomy | Engine §47.12 — **P레인** Fact-only · 전레인 자율집행 0 |
| ai-general-no-money-tools · ai-lane-router · llm-adapter-contract | Engine §47.8·47.13~14 (v7.22.16) |
| llm-quota-degrade | Engine §47.13 — 429→G busy·P Fact · 자동 failover 0 · toast `PEOTTEOK_LLM_BUSY` |
| pwa-manifest · pwa-serwist-single · pwa-brand-icons | PWA §23.1·25·26 — 퍼뜩·Lux theme · SW 1곳 · Brand icons (v7.22.17) |
| push-dedup · pwa-phase0-bus | PWA §23.5 — source_event_id · Phase0 NATS 0 |
| webauthn-fallback-pointer | Money §43.6 Owns · PWA §23.6 UX only |
| lighthouse-pwa | PWA §26 — CI ≥90 · local 8GB stub OK |
| mockup-governance · canon-surfaces · brand-assets | UI ADR-013/011 |
| asset-image-surface · execution-surfaces | Engine §0.0.6 · UI §48.3a — category thumb · `시세 불러오는 중...` (v7.22.20) |
| balance-aware-feed | Engine §0.0.5.1 · Money §49.2a · UI §5.3a — affordable/nearMiss/suggest (v7.22.21) |
| admin-user-opportunity-override | Admin §9.8.9 — 유저별 숨김/핀/마진 · ledger 불변 (v7.22.21) |
| referral-unlimited-invites · referral-pool-fifo | Money §51.5 — 월간초대캡 0 · Pool FIFO · queued_pool (v7.22.22) |
| invite-explain-surfaces | UI §5.9.1a — KR 20~70 설명·noCap·Canon invite-home (v7.22.22) |
| match-strictness · no-success-rate-percent | Engine §48.13.3 · UI §48.6 — 엄격도 조절 · 난수 성공률 0 (v7.22.23) |
| membership-ladder · membership-daily-cap · no-fulfill-rate-as-rule | Engine §0.0.7 — 등급·일일캡 · fulfillRate≠Rule (v7.22.24) |
| membership-surfaces | UI §5.9.2c · Canon membership-home — 100%보장0 · 고액희소 (v7.22.24) |
| admin-user-credentials · admin-user-ban · admin-user-match-override | Admin §9.8.10 — 비번/PIN·밴·유저별엄격도 (v7.22.24) |
| admin-user-capability-block | Admin §9.8.4a — 매칭/출금신청 개별차단 (v7.22.25) |
| ops-inbox · notification-prefs-default-on | UI §5.9.4·§50.1n — 쪽지함 · 가입알림전부ON (v7.22.25) |
| push-channel-prefs | PWA §23.5a — notice/campaign/opp/ops prefs 필터 (v7.22.25) |
| membership-badge-assets | UI §5.9.2c — Brand membership SVG 5종 · 사진목업0 (v7.22.25) |
| opportunity-scan-surface · arbitrage-type-label | UI §5.3b · Engine §4.2a — 홈기회스캔·타입뱃지 (v7.22.26) |
| cta-earn-profit · user-trader-jargon-0 | Index §20.2 · UI §48 — 유저 CTA=`수익 벌기` · domain=`participate` · `이 상품으로…`/구매/판매/유저메인`매칭 참여`/판매성공률/executionPlatforms 유저0 · 면책+배지 (v7.22.28) · 구명 `cta-match-participate`=alias · **copy/Canon live** · jargon=stub |
| soft-hard-requeue-sla | Index §20.2 · Engine §48.13 · UI §48 — Soft60/Hard90 · `MATCH_TIMEOUT` · 카피3줄(보통1분/다시맞추는중/시간지나안전정지) · presentation≠SLA (v7.22.29) · Audit A4 · **copy/Canon live** |
| match-tension-surface | Index §20.2 · UI §48.3b — Soft/Hard전등급동일 · 긴장감=과정Fact · 등급≠대기특권 · slaAlmost/priceNearMiss · 난수틱·가짜대기·당첨게이지0 (v7.22.30) · Audit A6 · **copy/Canon live** |
| listing-legs-day1 | Engine §0.0.1a/§0.0.2 — ebay 멀티marketplace\|admin only · yahoo_jp 영구FORBIDDEN · 야후/Yahoo카피0 · KR/Chrono24대체0 (v7.22.32) |
| kyc-withdraw-only · kyc-redirect · kyc-r2-only | Money §42 |
| krw-admin-decide | Money §41.3·§43.3 — approve credit / reject no-credit (v7.22.12) |
| admin-user-360 | Admin §9.8.7·§9.8.8 — netInflowUsdt · 유저360 탭 · notify audit (v7.22.13) |
| match-success-rule | Engine §48.13.2 golden 6 · random/timer 0 (v7.22.14) |
| pricing-formula · fx-snapshot-formula | Engine §0.0.4.1~4.2 |
| referral-ledger · notice-campaign-split | Money/Marketing |
| loop-psychology · day-pulse-live-only · preflight-may-stop | UI **§51.24** DayPulse·PreCTA·L1~L24 (v7.22.15 Owns 복원) |
| peotteok-chat · auth-complete-profile (canon) | UI §6.4b/e · canon-surfaces |

Stub = `tooling/verify/stubs/*.cjs` — 해당 코드 경로가 생기면 FAIL로 승격.
