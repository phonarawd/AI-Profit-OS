# REL-014 PWA NATIVE SHELL EVIDENCE

```text
REL = REL-014
TITLE = PWA native shell (E-PWA-001 only)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_VISUAL_REOPEN = 0
PUSH_CLAIM = 0
WEBAUTHN_CLAIM = 0
STORE_BRIDGE = 0
SERWIST_WEBPACK_PLUGIN = 0
EQUIVALENT_SW = 1
```

## IMPLEMENTATION

- Manifest: 퍼뜩 + ADR-017 `#6B3CFF` / `#F6F4FC` + 192/512/maskable icons
- Layout: manifest link, themeColor, apple-touch, PwaRuntime (Home geometry 비변경)
- Icons: existing Home spark `icon-192`/`icon-512` 재사용. Figma 승인 아이콘 없음
- SW: committed `public/sw.js` (OpenNext-safe 동등 SW). Push handler 0
- Install / SW update / offline overlay = `position:fixed` (문서 흐름 0)

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/pwa-native-shell.cjs` | PASS |
| `node tooling/verify/web-lint.cjs` | PASS |
| `node tooling/verify/no-it-jargon.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (9 steps) |

## ACCEPTANCE

E-PWA-001 only. Push 완료 주장 0. store-bridge 0.
