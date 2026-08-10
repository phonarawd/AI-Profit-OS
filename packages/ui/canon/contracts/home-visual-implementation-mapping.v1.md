# Home Visual Upgrade — Implementation Mapping v1

> STEP3 산출물 #4 · **코드 작성 금지** (STEP4 큐)  
> Contract · Wire · Token SPEC · ADR-017 선행 필수

## Existing (Keep / Adapt)

| Contract block | Component / path | Action |
|---|---|---|
| Live fetch | `apps/web/app/HomePageClient.tsx` | **Keep** orchestration · restyle children only |
| Page entry | `apps/web/app/page.tsx` | Keep → `HomePageClient` |
| Money B/D | `HomePrincipalRail` | **Adapt** · light tokens · no count-up |
| Opportunity | `BalanceAwareHome` · `OpportunityCard` · chips | **Adapt** |
| Mapper | `apps/web/lib/opportunity-card-map.ts` | Keep |
| SDK | `@aipo/sdk/user-feed` · `@aipo/sdk/growth` | Keep |
| Nav shell | `BottomNav5` · `USER_TABS` | **Adapt** labels §wire navLabels |
| Footer | `SiteFooter` · `MarketPartnerTrustStrip` | Adapt |
| DayPulse / Ticker / Counter | existing | **Adapt** — fold into Header/Hero Owns per Contract |

## New (STEP4 only)

| Contract block | Proposed name | Notes |
|---|---|---|
| Header | `AppHeader` | scan chip · bell · avatar · tier |
| Hero | `HomeHero` | copy · timeline · robot/globe **placeholders** · CTA 기회확인 |
| Right rail | `HomeRightRail` | status counts · top · total Fact |
| Invite strip | sidebar slot | reuse invite copy |

## Forbidden components / actions

| Forbidden | Why |
|---|---|
| `HomePageV2` | Parallel home · PART9 break |
| New design-system package | Use peotteok-light SPEC → existing token pipeline |
| Full Tailwind rewrite | Token cutover only |
| Pixel clone from PNG | ADR-017 |
| Ad-hoc hex in JSX | Token SSOT |
| Three.js / WebGL hero | Contract |
| Mock opportunity filler | Empty State Lock |
| Arbitrary animations | Animation Lock |

## STEP4 implementation queue (order)

1. Apply Token SPEC → `lux-fintech` / theme CSS + `verify:lux-theme-sync`
2. `USER_TABS` IA + `verify:ia-tabs`
3. Shell: Sidebar/Header (`BottomNav5` Adapt + `AppHeader`)
4. `HomeHero` (placeholders)
5. Money Adapt (`HomePrincipalRail`)
6. Opportunity Adapt + Empty 3-part
7. `HomeRightRail`
8. Motion CSS-only · perf check
9. PART9 regression: `home-live-wire` · `home-principal-slots` · `no-it-jargon` · `canon-surfaces`

## Verify touchpoints (STEP4)

- `verify:canon-surfaces` (wire already registered in STEP3)
- `verify:lux-theme-sync`
- `verify:ia-tabs`
- `verify:home-live-wire` · `verify:home-principal-slots`
- `verify:cta-earn-profit` (card CTA 수익 벌기)
- `verify:mockup-governance`
