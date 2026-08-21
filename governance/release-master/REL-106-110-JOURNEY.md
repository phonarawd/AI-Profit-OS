# REL-106~110 Core Opportunity Journey

DATE: 2026-08-21
STATUS: DEV/TEST fixture PASS — not production truth
PRODUCTION_MONEY_MUTATION: 0

## Journey

authenticated Home
→ `/profits`
→ `/profits/qa-rel106-opp`
→ ParticipateConfirmSheet
→ `/trades/qa-rel107-trade/execute`
→ `/trades`

## Continuity

- opportunity id `qa-rel106-opp`
- required capital `250.00` on list, detail, confirm
- execute is server-backed running (no confirmed profit)
- result list links the same `tradeId`

## Verify

- `verify:core-opportunity-journey` PASS (desktop 1440 + mobile 390)

## Screenshots

`governance/release-master/rel-106-110-journey/`
