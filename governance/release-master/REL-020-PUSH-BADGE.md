# REL-020 PWA PUSH+BADGE EVIDENCE

```text
REL = REL-020
TITLE = PWA Push+Badge (E-PWA-002)
STATUS = VERIFY_PASS
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
SECRET_COMMIT = 0
```

## IMPLEMENTATION

- VAPID 생성 경로: `tooling/pwa/generate-vapid.mjs` → `.env.local` / CF Workers Secrets. GitHub 0.
- `workers/push-dispatcher` 실연결: `/dispatch` + kill fail-closed. `stub_accepted` 제거.
- 구독 API: `POST/DELETE /api/v1/me/push-subscriptions` + `GET /api/v1/me/push/vapid-public`
- SW push handler + `setAppBadge` (REL-014 셸 재구현 0)
- Admin kill 계약: `GET/PUT /api/v1/admin/system-control/push` (UI는 REL-213)
- QA 1건: `tooling/pwa/pwa-push-badge.spec.cjs` + isolation guard — kill이면 send 0
- `push_subscriptions` / `push_control` migration = committedUnapplied (REL-701-DB 전)

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/pwa-push-badge.cjs` | PASS |
| `node tooling/verify/pwa-native-shell.cjs` | PASS |
| `node tooling/verify/migrations-applied-parity.cjs` | PASS |
| `node tooling/verify/web-lint.cjs` | PASS |
| `node tooling/verify/no-it-jargon.cjs` | PASS |
| `node tooling/verify/secrets.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (12 steps) |
| `CI=true node tooling/verify/gate-push.cjs` | PASS (38 steps) |

## ACCEPTANCE

E-PWA-002 범위 닫힘. 채널 필터는 REL-021. store-bridge 0. WebAuthn 0.
