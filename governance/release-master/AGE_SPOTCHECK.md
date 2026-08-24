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
PRODUCTION_WORKFLOW_DISPATCH = 0
MONEY_MUTATION = 0
HOME_VISUAL_REDESIGN = 0
PROTECTED_SCOPE_MUTATION = 0
PARTICIPATE_POST_REQUESTS = 0
```

## Scope

Founder decision **B**: replace manual 9-person study with **9 automated cohort runs** on staging preview.

- **Not** human subjects. Cohort IDs reuse age-band labels (`A20-*`, `A40-*`, `A6070-*`) as **automation profiles** (viewport / device class); they are not a demographic behavior model.
- Scenarios: **S1 signup · S2 opportunity · S3 participate entry · S4 wallet**.
- Staging UI origin: `https://ai-profit-web-preview.ebay-adapter.workers.dev`.
- The verifier performs separate **live GET liveness checks** against the staging routes.
- Playwright loads the **real staging UI bundle** but isolates API state with committed QA route stubs. This makes browser interaction deterministic and prevents production/staging money mutation.
- S3 intentionally stops at the preflight confirmation sheet and asserts **zero `/participate` POST requests**.
- Production / DB / money / protected-scope mutation: **0**.

## Cohort matrix (9 runs)

| Cohort | Age band label | Viewport | Device class |
|---|---|---|---|
| A20-01 | 20s | 390×693 | mobile |
| A20-02 | 20s | 1440×1080 | desktop |
| A20-03 | 20s | 768×1024 | tablet |
| A40-01 | 40s | 390×693 | mobile |
| A40-02 | 40s | 1440×1080 | desktop |
| A40-03 | 40s | 1024×768 | tablet |
| A6070-01 | 60–70s | 390×693 | mobile |
| A6070-02 | 60–70s | 1440×1080 | desktop |
| A6070-03 | 60–70s | 1366×900 | desktop-large-text profile label |

## Scenario sheet (automated assertions)

| ID | Staging route | Browser assertion |
|---|---|---|
| S1 | `/auth/signup` | live GET 200 · real signup surface visible · email form opens · terms gate disables/enables submit · no submit · forbidden tokens 0 · horizontal overflow 0 · axe blocking 0 |
| S2 | `/profits` | live GET 200 · QA-isolated opportunity feed · real staging card visible · expected detail href · required-capital text visible · overflow 0 |
| S3 | `/profits` → `/profits/{id}` | live GET 200 · QA-isolated feed/detail/preflight · real card click → detail `ready` → `data-requires-preflight=true` CTA click → confirmation sheet visible · preflight request exactly 1 · `/participate` POST request exactly 0 · overflow 0 |
| S4 | `/wallet` | live route accepted status · QA-isolated wallet read model · wallet `ready` · deposit / profit-withdraw / principal-withdraw / history CTAs visible · no money action click · overflow 0 |

Forbidden tokens (auto-fail): `jackpot`, `2450`, `vercel`.

## Evidence commands

| Command | Role |
|---|---|
| `pnpm verify:rel-603-age-usability-spotcheck` | SSOT verifier: fixture/plan/wiring safety → live staging GETs → Playwright 9×4 → dependency re-verifies |
| `pnpm exec playwright test --config=tooling/e2e/playwright.config.cjs tooling/e2e/specs/rel-603-age-usability-spotcheck.spec.cjs` | Direct Playwright 9×4 browser matrix |

Fixture: `tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json`

Playwright API isolation: `qa-stubs` from `tooling/e2e/lib/consumer-route-stubs.cjs`.

## Automated results (9×4)

All 36 cohort×scenario browser cells must PASS in CI before this evidence is accepted. The staging UI bundle is real; deterministic API data for browser interaction is QA-isolated as documented above. Live route liveness is checked separately by the verifier.

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
- Playwright **36/36** browser cells PASS
- S3 verifies actual card → detail → preflight confirmation-sheet entry and **does not submit participation**
- `PARTICIPATE_POST_REQUESTS = 0`
- `HUMAN_EXECUTED = 0` (explicit — not a hidden human study)
- automated P0 from this release-scope matrix: **0**

## Exit gate

- MCP-only browser clicks alone ≠ DONE; committed fixture + spec + verifier + CI are required.
- Human participant table is **superseded** by Founder B for REL-603 release scope.
- Age-band names are automation profile labels, not claims that Playwright simulates human cognition or demographic behavior.
- This does not claim to replace real-world longitudinal user research outside REL-603 release scope.
