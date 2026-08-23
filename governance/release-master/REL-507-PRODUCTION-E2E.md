# REL-507 PRODUCTION E2E

```text
REL = REL-507
TITLE = PRODUCTION_E2E
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
ISOLATION_GUARD = 1
PRODUCTION_DB_WRITE = 0
REAL_LEDGER_MUTATION = 0
INVENTED_SUCCESS = 0
MCP_ONLY_DONE = 0
LOCAL_FULL_MATRIX = 0
LOCAL_BROWSER_RUN = 0
LIVE_KAKAO_HUMAN_E2E = NOT_RUN
COMMITTED_SPEC = tooling/e2e/specs/production-loop.spec.cjs
```

## SCOPE

One committed Playwright line: login (magic-link request) -> participate -> settlement -> wallet.
QA isolation + loopback Next only. Production host 0. Success amount is reused from the existing opportunity expectedProfitUsdt. New win amount 0.

Kakao live human E2E stays NOT_RUN. That owner is REL-701-PRE.

## VERIFY

| command | result |
|---|---|
| `pnpm verify:rel-507-production-e2e` | this document + committed spec |
| `node tooling/verify/qa-env-isolation-guard.cjs` | re-run |

## EXIT_GATE

Guard-less production traffic = FAIL.
Invented success fixture = FAIL.
MCP-only click evidence = FAIL.
Kakao NOT_RUN claimed as production complete = FAIL.
