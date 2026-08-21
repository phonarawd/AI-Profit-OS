# REL-109 Matching / execute (`/trades/[id]/execute`)

BASE: `rel/REL-105-110-core-opportunity-loop` after REL-108 `96cbb2c`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: FOUNDER_REVIEW_CANDIDATE — not declared Approved

## Route

- ONE ROUTE: `/trades/[id]/execute`
- Presentation: `TradeExecuteClient` + `trade-execute.module.css`
- `?state=` / `previewState` cannot fake success

## Server state owner

- Owner = `useTradeExecution` → POST `/api/v1/trades/:id/execute-tick` (cookie session)
- Consumer map:
  - `running` → MatchingInProgress
  - `requeue` → MatchingRetrying
  - `success` + `settledProfitUsdt` → Settled
  - `success` without settled profit → 「처리 중이에요」 (확정 수익 0)
  - `safe_stop` → StoppedSafely
  - `cancelled` → Cancelled
  - `failed` → Failed
- 401 → unauthorized (not success)
- 404 → missing
- 5xx/network → retry copy, not empty success

## Motion / money

- ANIMATION_MUST_NEVER_LEAD_SERVER_TRUTH
- orbit/spark only while running/requeue
- `prefers-reduced-motion` disables animation; status text remains
- expected profit shown as 「예상 수익」 + 「아직 확정된 수익이 아니에요」
- 「확정 수익」 only after settled owner arrives
- no `progressPct` / `stepIndex` / query-fake / RNG

## Figma

- Desktop running `155:222` FOUNDER_REVIEW_CANDIDATE
- Mobile running `140:34` FOUNDER_REVIEW_CANDIDATE
- Mobile requeue `140:142` FOUNDER_REVIEW_CANDIDATE
- Mobile success `140:250` FOUNDER_REVIEW_CANDIDATE
- Mobile safe stop `140:358` FOUNDER_REVIEW_CANDIDATE

## Verify

- `verify:execute-web-wire` PASS
- `verify:execute-live-wire` PASS (9/9 Playwright)

## Screenshots

`governance/release-master/rel-109-execute/`

## Protected

- HomeDesktop/HomeMobile/spark-dash-home.css not modified
- no api-nest / engine-rust / migration mutation
