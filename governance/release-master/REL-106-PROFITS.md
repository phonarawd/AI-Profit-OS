# REL-106 Opportunity List (`/profits`)

BASE: `rel/REL-105-110-core-opportunity-loop` after REL-105 `938f9cd`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: FOUNDER_REVIEW_CANDIDATE — not declared Approved

## Route

- ONE ROUTE: `/profits`
- Desktop/Mobile: `ProfitsDesktop` + `ProfitsMobile` sharing one feed owner
- Fixture preview only: `/dev/spark-dash-profits`

## Data truth

- Owner = `GET /api/v1/opportunities` via `fetchOpportunityFeed`
- 401 → UNAUTHORIZED (not empty)
- 5xx/network → ERROR (not empty)
- `items.length === 0` → EMPTY
- required capital owner = `requiredCapitalUsdt` pass-through
- missing capital → `확인할 수 없음` (not 0)
- search/filter are wired; sort label is the single real `recommended` order

## Figma

- Desktop `76:2` FOUNDER_REVIEW_CANDIDATE
- Mobile `116:28` FOUNDER_REVIEW_CANDIDATE
- Empty `122:34` FOUNDER_REVIEW_CANDIDATE
- `official` filter chip in Figma is not shown: no owner for official-only filtering

## Verify

- `verify:sdk-user-feed` PASS
- `verify:profits-live-wire` PASS (7/7 Playwright)

## Screenshots

`governance/release-master/rel-106-profits/`

## Protected

- HomeDesktop/HomeMobile/spark-dash-home.css not modified
- no api-nest / engine-rust / migration mutation
