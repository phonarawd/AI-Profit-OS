# REL-022 WEBAUTHN UX/RP EVIDENCE

```text
REL = REL-022
TITLE = WebAuthn UX/RP + haptics fallback (E-PWA-004)
STATUS = VERIFY_PASS
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
SECRET_COMMIT = 0
MONEY_OWNER_CHANGE = 0
```

## IMPLEMENTATION

- Auth/WebAuthn 엔드포인트 실사: 기존 `POST /api/v1/auth/passkey/*` 유지. attestation 재설계 0.
- RP: `infra/domain.manifest.json` → rpId=`hiptk.app` · origin=`https://app.hiptk.app`.
- 미지원/실패: `AuthLogin`이 카카오·이메일 등 기존 버튼을 유지하고 `passkeyFallback`을 보여 줌. 빈 화면 0.
- 햅틱: `optionalHaptic` try/catch. reduced-motion이면 스킵. 실패해도 로그인 흐름 계속.
- QA: `tooling/pwa/webauthn-ux.spec.cjs` + isolation guard.
- SW에 WebAuthn 미배선 (REL-014 셸 유지).

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/webauthn-ux-rp.cjs` | PASS |
| `node tooling/verify/webauthn-fallback-pointer.cjs` | PASS |
| `node tooling/verify/auth-surfaces.cjs` | PASS |
| `node tooling/verify/pwa-native-shell.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (16 steps) |
| `CI=true node tooling/verify/gate-push.cjs` | PASS (38 steps) |

## ACCEPTANCE

E-PWA-004 닫힘. Money §43 fallback 계약 재사용. money 회로 재설계 0.

## EXIT_GATE

fallback 없는 hard depend면 FAIL — 미지원 기기에서도 기존 로그인이 남는다.
