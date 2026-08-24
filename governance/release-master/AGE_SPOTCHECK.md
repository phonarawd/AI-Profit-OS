# REL-603 — Automated age-band usability cohort (Founder B)

```text
REL = REL-603
STATUS = COMPLETED
AUTOMATION_LEVEL = A2
AUTOMATED_COHORT = 1
HUMAN_EXECUTED = 0
HUMAN_PARTICIPANTS_REQUIRED = 0
AUTOMATED_COHORT_EXECUTED = 1
COHORT_RUNS_COMPLETE = 9
ACCEPTANCE_MET = 1
FAKE_PASS = 0
MCP_ONLY_DONE = 0
PRODUCTION_DOMAIN_MUTATION = 0
PRODUCTION_DB_MUTATION = 0
MONEY_MUTATION = 0
HOME_VISUAL_REDESIGN = 0
```

## Scope

Founder decision **B**: replace manual 9-person study with **9 automated cohort runs** on staging preview.

- **Not** human subjects. Cohort IDs reuse age-band labels (`A20-*`, `A40-*`, `A6070-*`) as **automation profiles** (viewport / device class).
- Scenarios: **S1 signup · S2 opportunity · S3 participate entry · S4 wallet** on staging web.
- Tooling: committed Playwright spec + `verify:rel-603-age-usability-spotcheck` (live HTTP + Playwright + deps).
- Staging: `https://ai-profit-web-preview.ebay-adapter.workers.dev`
- Production / DB / money mutation: **0**

## Cohort matrix (9 runs)

| Cohort | Age band | Viewport | Device class |
|---|---|---|---|
| A20-01 | 20s | 390×693 | mobile |
| A20-02 | 20s | 1440×1080 | desktop |
| A20-03 | 20s | 768×1024 | tablet |
| A40-01 | 40s | 390×693 | mobile |
| A40-02 | 40s | 1440×1080 | desktop |
| A40-03 | 40s | 1024×768 | tablet |
| A6070-01 | 60–70s | 390×693 | mobile |
| A6070-02 | 60–70s | 1440×1080 | desktop |
| A6070-03 | 60–70s | 1366×900 | desktop-large-text |

## Scenario sheet (automated assertions)

| ID | Path | Automated checks |
|---|---|---|
| S1 | `/auth/signup` | HTTP 200 · signup/auth markers · no forbidden tokens · no horizontal overflow · axe blocking 0 on HTML snapshot |
| S2 | `/profits` | HTTP 200 · profits/opportunity markers · overflow 0 |
| S3 | `/profits` | HTTP 200 · participate entry markers on list surface · overflow 0 |
| S4 | `/wallet` | HTTP 200 · wallet/usdt markers · overflow 0 |

Forbidden tokens (auto-fail): `jackpot`, `2450`, `vercel`.

## Evidence commands

| Command | Role |
|---|---|
| `pnpm verify:rel-603-age-usability-spotcheck` | SSOT verifier (live + Playwright 9×4 + deps) |
| `pnpm exec playwright test --config=tooling/e2e/playwright.config.cjs tooling/e2e/specs/rel-603-age-usability-spotcheck.spec.cjs` | Direct Playwright (optional) |

Fixture: `tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json`

## Automated results (9×4)

All cohort×scenario cells **PASS** via Playwright against staging preview (read-only; no money mutation).

| Cohort | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| A20-01 | PASS | PASS | PASS | PASS |
| A20-02 | PASS | PASS | PASS | PASS |
| A20-03 | PASS | PASS | PASS | PASS |
| A40-01 | PASS | PASS | PASS | PASS |
| A40-02 | PASS | PASS | PASS | PASS |
| A40-03 | PASS | PASS | PASS | PASS |
| A6070-01 | PASS | PASS | PASS | PASS |
| A6070-02 | PASS | PASS | PASS | PASS |
| A6070-03 | PASS | PASS | PASS | PASS |

## Acceptance

- `AUTOMATED_COHORT_EXECUTED = 1`
- `COHORT_RUNS_COMPLETE = 9`
- `verify:rel-603-age-usability-spotcheck` PASS
- `HUMAN_EXECUTED = 0` (explicit — not a hidden human study)
- P0 from automated run: **0** (no reopen triggered)

## Exit gate

- MCP-only browser clicks alone ≠ DONE (committed spec + verifier required).
- Human participant table is **superseded** by automated cohort matrix above.
- Do not claim this replaces real-world longitudinal user research outside release scope.
