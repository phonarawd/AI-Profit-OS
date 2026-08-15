# Home Visual Upgrade — Implementation Mapping v1.1

> ⚠️ **SUPERSEDED (VISUAL AUTHORITY) · HISTORICAL · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION**
> **2026-08-16 — [`ADR-018-peotteok-visual-master-reset.md`](./ADR-018-peotteok-visual-master-reset.md)** 가 본 문서의
> 시각 구현 매핑 권위를 종료·승계했다. 이 결정은 당시에는 유효했지만, 새 Visual Master Reset(ADR-018)에 의해 시각
> 권위가 **superseded**되었다. Keep/Adapt 컴포넌트 목록(`HomePageClient` fetch 보존 등 PART9 경계)은 비시각
> 보호 경계로서 ADR-018 §7로 승계되어 계속 유효하다 — 새 mapping 작성 시 이 문서를 사례 참고만 할 것.

> STEP 4.1 / 4.4 산출 · **STEP 4 구간 코드 작성 금지**  
> STEP 5는 [`peotteok-home-implementation-gate.v1.md`](./peotteok-home-implementation-gate.v1.md) Founder 승인 후만  
> SSOT: Implementation Contract (STEP 3 ACK) · Visual Contract v1.4 · Wire · Token SPEC · ADR-017

## Authority

```text
Backend Fact > Product Contract > IA > Implementation Contract > Visual Contract > PC Reference
```

## Existing (Keep / Adapt)

| Contract block | Component / path | Action |
|---|---|---|
| Live fetch | `apps/web/app/HomePageClient.tsx` | **Keep** orchestration · **C01 binding만** 최소 수정 |
| Page entry | `apps/web/app/page.tsx` | Keep → `HomePageClient` |
| Experience | `HomeExperience.tsx` | Adapt RightRail settle-only · progress fake rows 제거 |
| Money B/D | `HomePrincipalRail` | **Adapt** · principal + today possible · no split · no chart |
| Opportunity | `BalanceAwareHome` · `OpportunityCard` · chips | **Adapt** |
| Mapper | `apps/web/lib/opportunity-card-map.ts` | 🔒 Keep |
| SDK | `@aipo/sdk/user-feed` · `@aipo/sdk/growth` | 🔒 Keep |
| Nav shell | `BottomNav5` · `USER_TABS` | **Adapt** labels §wire navLabels |
| Header | `AppHeader` | Adapt · DayPulse chip · no live FSM |
| Hero | `HomeHero` · `HomeHeroIllustration` | Polish · Contract timeline/copy |
| Right rail | `HomeRightRail` | Adapt · COUNT settle · no donut · no scan/confirm/progress |
| Counter | `HomePayoutCounter` / lux | Adapt · **COUNT semantics** · never USDT |
| Session | `HomeSessionBanner` | Keep/Adapt copy |
| Footer | `SiteFooter` · `MarketPartnerTrustStrip` | Adapt · Brand ready only |
| DayPulse / Ticker | existing slots | Keep verify slots · visual Owns → Header |

## Forbidden components / actions

| Forbidden | Why |
|---|---|
| `HomePageV2` | Parallel home · PART9 break |
| Parallel data pipeline | LOCK C |
| `ledgerTotal` as USDT | C01 semantic defect |
| Mock number injection | LOCK A |
| scan/confirm/progress UI without Fact | C04 |
| 30d chart / growth% | C03 |
| available/locked Home split | C02 |
| PayPal without Brand | C09 |
| New design-system package | peotteok-light only |
| Pixel clone from PNG | Geometry Reference only |
| Ad-hoc hex in JSX | Token SSOT |
| Three.js / WebGL hero | 현재 Home Master = static 선호·LOCK · 기술명 영구금지 아님 · `peotteok-performance-target.mdc` |
| Mobile geometry final from PC shrink | §13 provisional |

## STEP 5 implementation queue (order · Gate 승인 후)

| # | Slice | Focus |
|---|---|---|
| **0** | **C01 binding fix** | `ledgerTotal` → count-only OR hide · remove `` `${n} USDT` `` · counter/RightRail 정합 · regression |
| 1 | Shell | Sidebar / Header / IA tabs |
| 2 | Hero | copy · timeline · illustration · CTA |
| 3 | Money | `HomePrincipalRail` Fact surface |
| 4 | Opportunity | grid · empty 3-part · CTA |
| 5 | RightRail | settle + today possible + TOP3 |
| 6 | Partner / polish | Brand strip · motion CSS-only · perf |
| 7 | PART9 regression | gates below |

**C01 미통과 시** Shell 이후 시각 슬라이스 착수 금지.

## Verify touchpoints (STEP 5)

- `verify:home-live-wire`
- `verify:home-principal-slots`
- `verify:canon-surfaces`
- `verify:ia-tabs`
- `verify:no-it-jargon`
- `verify:cta-earn-profit`
- `verify:brand-consumer`
- `verify:lux-theme-sync`
- `verify:mockup-governance`
- `verify:gate:fast` (T0)
- **Manual C01:** no `ledgerTotal`+`USDT` string bind on Home

## Frozen systems (전 슬라이스)

`services/api-nest/**` · SDK packages · mapper · DB/Ledger/Engine · Auth/JWT · `apps/admin/**` · workers
