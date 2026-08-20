# REL-012 AXE HARNESS EVIDENCE

```text
REL = REL-012
TITLE = axe-core를 committed Playwright 하네스에 배선
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_VISUAL_REOPEN = 0
MCP_ONLY_EVIDENCE = 0
```

## Changed paths

- `tooling/e2e/lib/axe-scan.cjs` — axe-core + jsdom in-process scan
- `tooling/e2e/specs/axe-a11y.spec.cjs` — Playwright spec (Home 390/1440 + /auth/login)
- `tooling/e2e/fixtures/axe-known-issues.v1.json` — Home freeze allowlist (empty)
- `tooling/e2e/README.md`
- `tooling/verify/axe-harness.cjs`
- `tooling/verify/domain-by-path.cjs`
- `tooling/verify/CATALOG.md`
- `package.json` — axe-core + jsdom + verify:axe-harness
- `pnpm-lock.yaml`

Intentionally untouched: HomeDesktop/HomeMobile/Home CSS, Money/Engine, production DB.

Browser live scan is gated `AXE_BROWSER=1`. This REL is not REL-105 a11y closure.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/axe-harness.cjs` | PASS (axe-core runs · unlabeled button FAIL · Home 390/1440+login) |
| `CI=true pnpm verify:gate:fast` | PASS (7 steps) |

## ACCEPTANCE

하네스에 a11y 게이트가 존재. Home freeze 재설계 0. MCP-only 0.

## EXIT_GATE

axe 배선됨. REL-105 a11y 클로저 주장 0.
