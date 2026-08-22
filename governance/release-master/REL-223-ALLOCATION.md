# REL-223 — Allocation / Manual Match / Bulk

STATUS: PASS
DATE: 2026-08-22

## Verbs

ALLOW / BLOCK / PAUSE / CANCEL / REASSIGN

## Verify

- `pnpm verify:rel-223-allocation-match`

## Negative

- FAKE_MANUAL_MATCH = 0
- SECOND_MATCH_OWNER_CREATED = 0
- BALANCE_UPDATE_OWNER_CREATED = 0
- 부분 실패를 전체 성공으로 보고 0
