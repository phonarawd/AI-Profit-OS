# REL-011 WEB LINT EVIDENCE

```text
REL = REL-011
TITLE = apps/web 실제 lint 구현 (no-op 교체)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-011
FIRST_EXECUTION_TODO = REL-012
PROTECTED_SCOPE_MUTATION = FALSE
HOME_VISUAL_REOPEN = 0
FAKE_MONEY = 0
```

## Changed paths

- `apps/web/package.json` — `lint` no-op echo 제거, `eslint .` + eslint/typescript-eslint
- `apps/web/eslint.config.mjs` — ESLint 9 flat config. 최소 차단(파서 + no-debugger)
- `tooling/verify/web-lint.cjs`
- `tooling/verify/domain-by-path.cjs`
- `tooling/verify/CATALOG.md`
- `package.json`
- `pnpm-lock.yaml`

Intentionally untouched: Home, Money/Engine, vscode `eslint.enable` (false), plans/docs.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/web-lint.cjs` | PASS (eslint inspects apps/web · syntax error FAIL · no-op 0) |
| `CI=true pnpm verify:gate:fast` | PASS (8 steps) |
| GitHub `gate.yml` | SUCCESS `32397083503` |

## ACCEPTANCE

lint가 실제 파일을 검사한다. no-op exit 0 제거.

## Git

```text
REMOTE_MAIN_BEFORE = 5232a0a7f22a442020cfe13d9b9f277e0ecb657f
BRANCH = rel/REL-011-web-lint
HEAD_SHA = 6b7fa67
PR = https://github.com/phonarawd/AI-Profit-OS/pull/10
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32397083503
MERGE_METHOD = merge
MERGE_COMMIT = 1701acff2b54f7a1ae5bb974425581f649e9e032
REMOTE_MAIN_AFTER = 1701acff2b54f7a1ae5bb974425581f649e9e032
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```

## EXIT_GATE

no-op 잔존 0. REL-011 PASS — REL-012 착수 가능.
