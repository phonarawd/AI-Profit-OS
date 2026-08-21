# REL-107 Opportunity Detail / Room (`/profits/[id]`)

BASE: `rel/REL-105-110-core-opportunity-loop` after REL-106 `6d2972d`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: FOUNDER_REVIEW_CANDIDATE — not declared Approved

## Route

- ONE ROUTE: `/profits/[id]`
- Desktop/Mobile: `OpportunityRoomDesktop` + `OpportunityRoomMobile` sharing one `OpportunityRoomModel`
- Fixture preview only: `/dev/spark-dash-room`

## Data truth

- Owner = `GET /api/v1/opportunities/:id` via `fetchOpportunityDetail`
- 401 → UNAUTHORIZED (not empty / not missing)
- 404 → MISSING
- 5xx/network → ERROR (not missing)
- required capital owner = `requiredCapitalUsdt` pass-through
- missing capital → `확인할 수 없음` (not 0)
- `capitalKrw` always null (client FX multiply 0)
- List→Detail identity: same opportunity id + same required capital
- CTA `이 기회로 수익 벌기` issues `POST .../preflight` then confirm sheet
- accepted participate navigates to `/trades/:tradeId/execute` (opportunityId ≠ tradeId)

## Figma

- Desktop `96:2` FOUNDER_REVIEW_CANDIDATE
- Mobile `104:43` FOUNDER_REVIEW_CANDIDATE
- Mobile scroll `109:28` FOUNDER_REVIEW_CANDIDATE

## Verify

- `verify:participate-web-wire` PASS
- `verify:opportunity-detail-live-wire` PASS (8/8 Playwright)

## Screenshots

`governance/release-master/rel-107-room/`

## Protected

- HomeDesktop/HomeMobile/spark-dash-home.css not modified
- no api-nest / engine-rust / migration mutation
