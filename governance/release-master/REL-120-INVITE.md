# REL-120 Referral (`/me/invite`)

BASE: `rel/REL-120-130-account-hub` from `origin/main` `0b32b47`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: NOT_FOUND — no §2 Account Hub frame — node-id not invented

## Route

- ONE ROUTE: `/me/invite`
- Presentation: `InviteClient` + shared AccountFrame (Spark Dash DNA)
- leftover 5-tab `LegacyAppShell` removed from `/me` layout

## UI_STATE_BEFORE

EXISTING_PARTIAL — `InviteHome` mounted with no referral API props

## Data truth

- Owner = `GET /api/v1/referral/me`
- Bind = `POST /api/v1/referral/bind`
- 401 → unauthorized (not empty invite)
- 5xx/network → unavailable (`확인할 수 없음`)
- missing invite code → `확인할 수 없음` (API가 내 코드를 항상 주지 않음)
- missing stats → 0 금지
- L1/L2/L3 영문 라벨 0
- referral % 창작 0

## Verify

- `verify:invite-closure`
- `verify:invite-explain-surfaces`
- `verify:part5-shell-toast`

## Protected

- no Nest / engine / migration mutation
- Home freeze 0
- Wallet loop 0
