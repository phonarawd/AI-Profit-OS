# REL-108 Participate Confirmation (sheet)

BASE: `rel/REL-105-110-core-opportunity-loop` after REL-107 `35ef9fb`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: FOUNDER_REVIEW_CANDIDATE — not declared Approved

## Route

- No dedicated production URL. Sheet mounts on `/profits/[id]`.
- 11 visual keys also previewed at `/dev/spark-dash-room?sheet=` (DEV/TEST only).

## Participation truth

- Confirm CTA enabled only after `POST .../preflight` returns a token
- `amountUsdt = requiredCapitalUsdt`
- `INSUFFICIENT_PRINCIPAL` → 입금하기, not success
- `PREFLIGHT_REQUIRED` → 다시 확인, not closed
- `ACCEPTED` only after `postParticipate` returns `tradeId`
- SUBMITTING is shown while the participate request is in flight

## Figma

- Desktop `103:315` FOUNDER_REVIEW_CANDIDATE
- 11-state `103:314` FOUNDER_REVIEW_CANDIDATE (not a §2 top-level frame)

## Verify

- `verify:participate-sheet-live-wire` PASS (7/7 Playwright)

## Screenshots

`governance/release-master/rel-108-sheet/`

## Protected

- Home visual files not modified
- no api-nest / engine-rust / migration mutation
