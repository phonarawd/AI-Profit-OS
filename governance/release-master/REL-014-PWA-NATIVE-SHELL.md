# REL-014 PWA NATIVE SHELL EVIDENCE

```text
REL = REL-014
TITLE = PWA native shell (E-PWA-001 only)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-014
FIRST_EXECUTION_TODO = REL-015
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
| GitHub `gate.yml` | SUCCESS `32399814753` |

## ACCEPTANCE

E-PWA-001 only. Push 완료 주장 0. store-bridge 0.

## Git

```text
REMOTE_MAIN_BEFORE = 2ab2b717f279c029b451fe7fa9009d98236ab729
BRANCH = rel/REL-014-pwa-native-shell
HEAD_SHA = eda9865
PR = https://github.com/phonarawd/AI-Profit-OS/pull/13
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32399814753
MERGE_METHOD = merge
MERGE_COMMIT = 739bbbe0e375e1e4107d91b1bfdf814cf21f5936
REMOTE_MAIN_AFTER = 739bbbe0e375e1e4107d91b1bfdf814cf21f5936
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```
