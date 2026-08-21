# REL-006 QA_ENV_ISOLATION_GUARD + QA-LAB-BOOTSTRAP EVIDENCE

```text
REL = REL-006
TITLE = QA_ENV_ISOLATION_GUARD + QA-LAB-BOOTSTRAP (committed Playwright spec)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-006
FIRST_EXECUTION_TODO = REL-007
```

## Changed paths

- `tooling/e2e/**` (README, playwright config, allowlist, guard, money gate, auth helper, placeholder spec, persona seed)
- `tooling/verify/qa-env-isolation-guard.cjs`
- `tooling/verify/CATALOG.md`
- `tooling/verify/domain-by-path.cjs`
- `package.json` (`verify:qa-env-isolation-guard`)

Intentionally untouched: Home, Money/Engine source, production DB, Playwright MCP-only evidence.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/qa-env-isolation-guard.cjs` | PASS (production throw · money fail-closed · committed spec) |
| `CI=true pnpm verify:gate:fast` | PASS (5 steps) |
| `CI=true pnpm verify:gate:push` | PASS (26 steps) |
| GitHub `gate.yml` / `verify-gate` | SUCCESS `32391748163` |

Selftests: production URL/ref throw; money callback does not run on production or empty target; local `127.0.0.1` allowlist runs; README forbids MCP-only DONE.

## ACCEPTANCE

Bootstrap Lab is in git. Money mutation tests cannot run before the guard passes.

## Git

```text
REMOTE_MAIN_BEFORE = 345b4d682cc1226939ed062005739e865b0abae7
BRANCH = rel/REL-006-qa-lab-bootstrap
HEAD_SHA = 2508b5047b6dc12e7fdfdd73dc6a79fb79f34835
PR = https://github.com/phonarawd/AI-Profit-OS/pull/5
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32391748163
MERGE_METHOD = merge
MERGE_COMMIT = 06d688a2674ac9cf37f9be7cad5be64499121495
REMOTE_MAIN_AFTER = 06d688a2674ac9cf37f9be7cad5be64499121495
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
MCP_ONLY_EVIDENCE = 0
```

## EXIT_GATE

Guard exists. REL-007 money tests may start.
