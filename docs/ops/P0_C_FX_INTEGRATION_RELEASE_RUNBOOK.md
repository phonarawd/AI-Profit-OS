# P0-C FX integration and release runbook

Status: **READINESS ONLY — production deployment is not authorized by this document.**

## 1. Immutable current boundaries

- P0-C PR #76 must remain unmerged while Engine Acceptance is not issued.
- Human/PO `ENGINE_ACCEPTANCE_REBASE_V1` ACK is a separate explicit boundary.
- P0-D must not start before P0-C is accepted and merged.
- P0-B/eBay behavior must not be changed by the FX release path.
- USDT is authoritative. KRW is approximate and must fail closed when freshness/trust is unavailable.
- Browser/user traffic must never call CoinGecko directly.

## 2. FX worker isolation

The release unit for P0-C FX is exactly:

- `coingecko-adapter`
- `frankfurter-adapter`

`phase1` is **not** a safe P0-C deployment unit because it contains unrelated market, chain and commerce workers.

The manifest therefore has a dedicated `p0-fx` exact set. The existing `phase0`, `phase1`, and `p0-ebay` sets remain semantically unchanged.

## 3. Current production blocker

The current CoinGecko implementation uses the Demo endpoint/header contract:

- `https://api.coingecko.com/api/v3`
- `x-cg-demo-api-key`

Official CoinGecko material does not currently establish a commercial license for Demo, while paid API plans document commercial licensing and use a different Pro API authentication/base URL contract.

Therefore:

`P0_FX_PRODUCTION_PROVIDER_STATUS = COMMERCIAL_PROVIDER_NOT_CLEARED`

The dedicated FX deploy script must fail closed on production apply until a separately reviewed provider-commercial migration/clearance is complete.

## 4. Pre-ACK / pre-merge work allowed

Read-only/readiness work only:

1. Validate the isolated `p0-fx` manifest.
2. Run production and preview dry-run plans (`mutation=0`).
3. Validate health contracts with static fixtures.
4. Validate rollback guard logic with static fixtures.
5. Keep production deployment unavailable.

No ACK, rebase, certificate, merge, production secret, production deploy, DB mutation, or P0-D action is implied.

## 5. Engine Acceptance order

Only after an explicit Human/PO ACK:

1. Freshly recalculate protected and non-protected support paths.
2. Run rebase dry-run with the exact ACK text and explicit `--support-path` values.
3. Apply the new acceptance epoch only if dry-run is correct.
4. Execute current-epoch discovery suites in V2 order: QA1 → QA2 → QA3 → QA4 → QA5 → QA6 → QA7 → QA8.
5. Run QA9 aggregation only after the current-epoch discovery evidence exists.
6. Issue the certificate only if the new epoch really satisfies issuance policy.
7. Never reuse predecessor QA9 as a current verdict and never hash-wash live code to match an old baseline.

## 6. PR integration order

### Step A — P0-C

After a true Engine certificate and separate explicit merge authorization:

- merge PR #76,
- re-read the resulting main SHA,
- rerun required post-merge checks on main.

### Step B — execution experience (#75)

Rebase/update #75 onto the accepted main.

The execution UI must not calculate FX. Use its existing ReactNode money slots and inject the shared P0-C `MoneyAmount` component.

For KRW refresh, reuse the established current-FX helpers rather than creating another provider/API path.

Required truths:

- server-authored execution progress/status remains authoritative,
- expected/settled USDT remains authoritative,
- KRW is secondary/fail-closed,
- no browser CoinGecko/Frankfurter calls,
- no USDT==USD assumption,
- no magic KRW rate.

Run full gate/build/Chromium/route/accessibility checks before any merge decision.

### Step C — premium global UI (#77)

After #75 is accepted/merged, rebase or retarget #77 onto current main.

Because #77 is currently stacked on #75, its absence of main-target PR CI is not a PASS. Once it targets current main, run the normal gate/worldclass/UI QA set on the actual final head.

### Step D — FX release hardening (#78)

PR #78 is stacked directly on #76 and is readiness-only. It must not be merged independently of the accepted P0-C line.

After #76 is accepted and merged, rebase #78 onto the resulting main and rerun its dedicated hardening CI. Keep production apply blocked until the provider-commercial migration and production Nest ingest prerequisites are separately satisfied.

## 7. FX production rollout prerequisites

All must be true before a production FX worker deployment can even be considered:

- Engine certificate is issued for the accepted product epoch.
- P0-C is merged and the production code SHA is known.
- CoinGecko commercial provider/auth path is explicitly cleared and implemented.
- `NEST_ADAPTER_INGEST_URL` points to a reachable production Nest ingest endpoint.
- `ADAPTER_INGEST_TOKEN` is bound to both FX workers.
- CoinGecko credential is bound to the CoinGecko worker using the approved commercial auth contract.
- Production health must report:
  - correct service/adapter/role,
  - `ingestConfigured=true`,
  - CoinGecko `credentialsConfigured=true`,
  - `manualTickEnabled=false`.
- Explicit rollback version IDs for both workers are captured before rollout.
- Production deployment has separate explicit ops authorization.

## 8. Production rollout sequence (future only)

When all prerequisites and explicit ops authorization exist:

1. Capture current deployed version IDs for both FX workers.
2. Run the exact-two production dry-run and archive the plan output.
3. Deploy only the exact `p0-fx` workers using the approved commercial provider configuration.
4. Run read-only health smoke immediately.
5. Confirm manual `/tick` is disabled in production.
6. Allow Cloudflare Cron propagation time; do not treat immediate deploy success as cron success.
7. Verify CoinGecko `lastFetchAt` and `lastSuccessAt` advance after a scheduled window.
8. Verify Frankfurter scheduled ingestion/persistence on its expected cadence.
9. Verify Nest persisted a trusted snapshot and the user current-FX API returns the expected freshness state.
10. Verify consumer UI keeps USDT authoritative and only displays KRW when allowed by the freshness/trust policy.

A failed provider fetch or failed Nest publication must not be called a successful rollout.

## 9. Rollback

Rollback is an exact-two operation.

Before mutation, prove both requested version IDs exist. If either is missing, mutation must remain zero.

For an authorized rollback:

- rollback `coingecko-adapter` to its captured version,
- rollback `frankfurter-adapter` to its captured version,
- re-run read-only health checks,
- verify current-FX user behavior fails closed if fresh KRW publication is not available.

Do not roll back web/ops/eBay as part of the FX worker rollback unless a separate incident analysis and authorization requires it.

Cloudflare Worker rollback changes Worker versions/bindings, not external database/storage state; data remediation is a separate concern.

## 10. Release status vocabulary

Use only evidence-backed values:

- `READY_FOR_DRY_RUN`
- `BLOCKED_COMMERCIAL_PROVIDER`
- `BLOCKED_NEST_INGEST`
- `DEPLOYED_HEALTH_UNVERIFIED`
- `DEPLOYED_HEALTH_PASS`
- `CRON_UNVERIFIED`
- `CRON_PUBLISH_PASS`
- `ROLLED_BACK`

Never map code review or `wrangler deploy` exit code alone to full production `PASS`.

## 11. Current stacked-PR collision matrix

Snapshot anchor: PR #76 HEAD `bbb7b18e30ec06d0895792731e4b794d4911e748`, PR #75 HEAD `1edcf87c7f1fbdc267100631eb01b109aaef90e8`, PR #77 HEAD `ced4e34793257c34bb60ea88ff3efde17a5ad696`. Recalculate this matrix whenever any head moves.

| Pair | Direct path overlap at snapshot | Integration meaning |
| --- | ---: | --- |
| #75 vs #76 | 0 | execution preview/components are isolated; later semantic integration is via money ReactNode slots |
| #77 vs #76 | 0 | premium account/auth/onboarding UI does not directly edit P0-C Money/FX files |
| #77 vs #78 | 0 | Cursor UI paths and FX release/ops paths are fully disjoint |
| #75 vs #77 | stacked ancestry | #77 is based on #75; do not treat them as independent merge order |
| #76 vs #78 | stacked ancestry | #78 is based on #76; readiness work must follow the accepted P0-C line |

A zero direct path overlap is not a guarantee of zero semantic conflict. Re-run full integration QA after rebasing each stacked PR onto the newly accepted main.

## 12. Commercial CoinGecko migration design — future separate product PR

Do not retrofit this inside the release-hardening PR. The current product code explicitly implements Demo authentication, so commercial production is not a secret-only operation.

A future provider-commercial PR should:

1. Make provider tier/auth configuration explicit rather than inferring it from a key value.
2. Support the approved commercial API base URL and matching authentication header documented by CoinGecko.
3. Keep the API key server/Worker-only and never expose it to the browser.
4. Preserve one batched upstream request for KRW/USD and the current 10-minute single-flight budget policy unless the commercial plan intentionally changes that policy.
5. Preserve upstream/Nest timeouts, publication truth, immutable snapshots, per-leg freshness and anomaly fail-closed behavior.
6. Preserve production manual tick disabled by default.
7. Update health so the configured provider tier/auth mode can be verified without leaking secret material.
8. Add deterministic tests proving Demo and commercial headers/base URLs cannot be accidentally mixed.
9. Re-run P0-C money/FX verification and the applicable acceptance/governance process before production deploy.

Do not rename or rotate production secrets until the new code path and rollout plan have been reviewed together. A paid key inserted into the current Demo header/base implementation is not a valid migration.

## 13. Stacked UI CI closure

PR #77 currently targets PR #75's branch, while normal `gate` and `consumer-spark-worldclass` pull-request workflows target `main`. Missing checks on #77 therefore remain `NOT_RUN`, not PASS.

Safe closure strategy:

1. While #77 is stacked, use bounded local/static checks and keep every unexecuted browser/build/axe item explicitly `NOT_RUN`.
2. Do not broaden the global workflow trigger merely to make a stacked draft green; that would create unrelated workflow governance drift.
3. Accept/merge #76 first when its own governance allows it.
4. Rebase and validate #75 on accepted main; integrate shared MoneyAmount only then.
5. After #75 is accepted, retarget/rebase #77 onto current main.
6. Run the normal main-target `gate`, `consumer-spark-worldclass`, Chromium route continuity and accessibility checks on the actual final #77 head.
7. Only those final-head runs may be used for merge readiness.

If Cursor pushes a new #77 head before this sequence, recompute its direct changed-file set and collision matrix before relying on earlier review.

## 14. Final release QA matrix

The final release decision needs evidence for every row below. A missing row is not implicitly green.

| Area | Required evidence |
| --- | --- |
| Engine governance | current epoch valid; certificate genuinely issued |
| P0-B | eBay deploy/runtime isolation and existing resilience checks green |
| P0-C money | USDT authoritative; KRW secondary; stale/transport fail-closed |
| Provider | commercial CoinGecko auth/license path cleared and tested |
| Worker isolation | exact `p0-fx` two-worker plan; phase1 not used for P0-C rollout |
| Worker health | correct adapter/service/role; ingest configured; credential configured; manual tick false |
| Cron | scheduled fetch/publication observed after propagation window |
| Nest | production ingest reachable and persistence confirmed |
| Current-FX API | fresh/stale/unavailable behavior verified against persisted truth |
| Web | no browser CoinGecko/Frankfurter fan-out; 45s refresh targets own API only |
| Execution | server state authoritative; MoneyAmount injected without client FX math |
| UI | 390/768/1024/1440 responsive checks on final integration head |
| Accessibility | keyboard focus, hit targets, reduced motion, axe/browser evidence |
| Routes | main consumer route continuity on final head |
| Rollback | both FX pre-deploy version IDs captured; rollback preflight proves both exist |
| Production ops | explicit production-deploy authorization recorded separately |

Release remains blocked if any critical truth is unknown, stale, inferred from an older SHA, or represented only by a local/static check when the required gate is runtime/browser/production evidence.

## 15. Main branch governance observation

Observation snapshot: 2026-08-26. Treat this as an operational observation, not a permanent repository contract; re-read the live ruleset before every merge decision.

At this snapshot the active main ruleset requires pull requests and has a required-status-check rule, but the required check list contains only `verify-gate`. `engine-acceptance` and `consumer-spark-worldclass` are not enforced as required status checks by that live ruleset, and an always-on repository-role bypass actor is present.

Consequences:

- GitHub being technically able to merge is **not** evidence that the Engine governance gate is satisfied.
- PR #76 remains HOLD while Engine Acceptance is not genuinely issued even if GitHub reports `mergeable=true`.
- A bypass must never be used to convert a governance failure into an apparent release PASS.
- This readiness PR does not mutate branch protection or rulesets. Any decision to strengthen required checks is a separate repository-governance change requiring explicit authorization and its own change review.

## 16. Legacy/open PR disposition queue

This queue is a current integration aid only. Re-evaluate heads and diffs before acting; do not close or merge based solely on this document.

| PR | Snapshot classification | Reason / safe next point |
| --- | --- | --- |
| #63 Admin Money | `REUSE_AFTER_REBASE` | only 3 direct files; admin wallet + UI QA/E2E; no direct P0-C file overlap; branch is 7 commits behind current main, so rebase and full admin QA are required before use |
| #69 KRW deposit instructions | `HOLD_UNTIL_P0_C_EPOCH_CLOSED` | useful consumer feature, but adds/changes `services/api-nest/src/wallet/*` under Engine protected root; integrating it now would create new protected-scope drift before P0-C acceptance closes |
| #68 BrowserStack gate | `BLOCKED_COMPATIBILITY` | official BrowserStack Playwright compatibility currently does not cover repository Playwright 1.62.1; do not downgrade main or fabricate a real-device PASS just to close the PR |
| #72 validation-only | `OBSOLETE_CLOSE_CANDIDATE` | evidence-only / DO NOT MERGE snapshot on an older line; current main contains newer accepted history |
| #74 validation-only | `OBSOLETE_CLOSE_CANDIDATE` | exact-head evidence-only / DO NOT MERGE snapshot; not a product merge candidate |
| #50 Phase A opportunity promotion | `REDESIGN_OR_CLOSE_CANDIDATE` | 125 commits behind current main at snapshot, currently non-mergeable, and directly overlaps P0-C protected files such as `adapters.admin.service.ts` and `opportunities.mi.ts`; do not resurrect by blind rebase/cherry-pick |

Recommended product order after P0-C acceptance is: settle #75/#77/#78 integration first, then reconsider #63, then create a fresh current-main implementation for #69 if still desired. #50 should be mined only for still-valid intent/tests, not merged as-is.
