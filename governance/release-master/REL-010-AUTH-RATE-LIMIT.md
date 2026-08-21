# REL-010 AUTH RATE LIMIT EVIDENCE

```text
REL = REL-010
TITLE = auth 라우트 rate limiting 실제 동작 검증/구현
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-010
FIRST_EXECUTION_TODO = REL-011
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_AUTH_FLOOD = 0
```

## Changed paths

- `services/api-nest/auth-rate-limit.cjs` — IP+account+route fixed window
- `services/api-nest/src/auth/auth-rate-limit.guard.ts`
- `services/api-nest/src/auth/auth-rate-limit.selftest.ts` — Nest HTTP 127.0.0.1
- `services/api-nest/src/auth/auth.controller.ts` — class-level guard
- `services/api-nest/src/auth/auth.module.ts`
- `tooling/e2e/lib/auth-rate-limit-harness.cjs`
- `tooling/e2e/specs/auth-rate-limit.spec.cjs`
- `tooling/verify/auth-rate-limit.cjs`
- `tooling/verify/CATALOG.md`
- `tooling/verify/domain-by-path.cjs`
- `package.json`

Intentionally untouched: Home, Money/Engine formulas, production DB, production credentials.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/auth-rate-limit.cjs` | PASS (429 after window · unknown IP limited · QA guard · Nest HTTP) |
| `CI=true pnpm verify:gate:fast` | PASS (10 steps) |
| GitHub `gate.yml` | SUCCESS `32394969431` |

User message = `요청이 너무 많아요. 잠시 후 다시 시도해 주세요.` IT jargon 0.

## ACCEPTANCE

auth 라우트 서버 rate limit 실동작. 테스트 없이 구현만 있지 않음.

## Git

```text
REMOTE_MAIN_BEFORE = 374e807c11f2d6d67db950ebced03b6add0c9d10
BRANCH = rel/REL-010-auth-rate-limit
HEAD_SHA = ecc772d52aaab45bf39435b3674e3263b0d3f628
PR = https://github.com/phonarawd/AI-Profit-OS/pull/9
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32394969431
MERGE_METHOD = merge
MERGE_COMMIT = 5232a0a7f22a442020cfe13d9b9f277e0ecb657f
REMOTE_MAIN_AFTER = 5232a0a7f22a442020cfe13d9b9f277e0ecb657f
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```

## EXIT_GATE

테스트 + Nest HTTP 429 실증 있음. REL-010 PASS — REL-011 착수 가능 (이 배치는 여기서 종료).
