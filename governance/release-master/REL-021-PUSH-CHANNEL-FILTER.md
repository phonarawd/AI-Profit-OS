# REL-021 PUSH CHANNEL FILTER EVIDENCE

```text
REL = REL-021
TITLE = 자동 Push 채널 필터 (E-PWA-003)
STATUS = VERIFY_PASS
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
SECRET_COMMIT = 0
```

## IMPLEMENTATION

- `notification_prefs` 실사: `supabase/migrations/20260808205844_identity_nest_auth.sql` 에 notice/campaign/opportunity 컬럼 존재. 신규 테이블 0.
- 채널 키 계약: `AUTO_PUSH_CHANNELS` + `schemas/push-channel-filter.v1.json` = notice / campaign / opportunity.
- dispatcher `planEmit` / `dispatchPush`: pref=false 또는 `channelAllowed=false` → enqueue 0 · sendAttempted false.
- Nest `PushEmitService.emitToUser`는 `channel` 필수 + `allowPush`. 채널 없는 전채널 강제 발송 경로 0.
- 설정 UI: 기존 `SettingsPanel` + `GET/PUT /api/v1/me/notification-prefs`. 전면 재디자인 0.
- committed spec: `tooling/pwa/pwa-push-channel-filter.spec.cjs`

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/push-channel-prefs.cjs` | PASS |
| `node tooling/verify/notification-prefs-default-on.cjs` | PASS |
| `node tooling/verify/pwa-push-badge.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (9 steps) |
| `CI=true node tooling/verify/gate-push.cjs` | PASS (32 steps) |

## ACCEPTANCE

E-PWA-003 닫힘. store-bridge 0. WebAuthn 0. Home 수정 0.

## EXIT_GATE

필터 없이 전채널 강제 발송이면 FAIL — emit는 channel 필수, missing channel + prefs = enqueue 0.
