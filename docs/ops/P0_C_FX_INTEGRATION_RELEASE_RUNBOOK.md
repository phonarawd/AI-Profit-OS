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
