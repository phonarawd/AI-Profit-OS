# REL-003 TRACK A DATA-CORE + REPRICE RESTORE EVIDENCE

```text
REL = REL-003
TITLE = Track A data-core + reprice 산출물 복원 (branch-PR-CI-merge)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-003
FIRST_EXECUTION_TODO = REL-004
DO_NOT_START_REL_004 = TRUE
```

## Stage A — local capture source

```text
SOURCE_PRESERVE_BRANCH = preserve/2026-08-20-worktree-rescue
SOURCE_PRESERVE_COMMIT = ae8d1e634cb07998982997bb520396b825a7a42e
REPRICE_PLAN = .cursor/plans/ai_profit_os_opportunity_reprice_freshness.plan.md
REPRICE_OWNER = OpportunityRepriceService
STALE_AT_WRITER = AS-OF (priced_at === stale_at)
LISTING_STALE = EXPIRY/CACHE_HINT 300s kept
```

Reprice service matches the legacy reprice-freshness plan:

- listing persist → unique assetIds → `repriceFromCurrentListings`
- existing opp missing → no-op
- `useAdminOverride === true` → skip
- market당 listing 0 or 2+ → fail-closed via `resolveStoredLegListingPrices`
- reprice fail → listing kept, fake success 0
- Admin `patchPricing` shares `persistComputedPricing`

## Stage B — GitHub-history transplant

```text
REMOTE_MAIN_BEFORE = db6db871a809c6748173d76430e2fe56c6b5484c
NEW_BRANCH_NAME = recovery/track-a-data-core
NEW_BRANCH_PARENT_SHA = db6db871a809c6748173d76430e2fe56c6b5484c
WORKTREE = _tmp_rel003_github_main
RESTORE_COMMIT = c3c3111193821805333972bba83f8e6a6d88bd89
PR_NUMBER = 3
PR_URL = https://github.com/phonarawd/AI-Profit-OS/pull/3
PR_HEAD_SHA = c3c3111193821805333972bba83f8e6a6d88bd89
CI_STATUS = SUCCESS
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32388878034
MERGE_COMMIT = f53e182f291f8c941e33671371075dec19142d36
REMOTE_MAIN_AFTER = f53e182f291f8c941e33671371075dec19142d36
```

Ancestry = `origin/main (db6db87) → c3c3111 (REL-003 restore) → f53e182 (merge PR #3)`.
`48ab180` / preserve branch are not merge parents.

```text
UNRELATED_HISTORIES_MERGED = 0
FORCE_PUSH_USAGE = 0
LOCAL_MAIN_REWRITTEN = 0
PRESERVE_BRANCH_MERGED = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
APPLY_MIGRATION_CALLS = 0
ADMIN_BYPASS_USED = 0
```

## Path set (15)

Product / restore:

- `services/api-nest/src/opportunities/opportunity-reprice.service.ts` (new)
- `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts`
- `services/api-nest/src/opportunities/opportunities.admin.service.ts`
- `services/api-nest/src/opportunities/opportunities.mi.ts`
- `services/api-nest/src/opportunities/opportunities.module.ts`
- `services/api-nest/src/opportunities/index.ts` (`OpportunityRepriceService` export only)
- `supabase/migrations/20260819210000_source_observations.sql`
- `supabase/migrations/20260819220000_canonical_products.sql`
- `supabase/migrations/20260820013000_match_results.sql`

Compile / verify deps (documented, same class as REL-002 `current-fx`):

- `services/market-intelligence/src/pipeline.cjs` (`resolveStoredLegListingPrices`)
- `services/market-intelligence/src/index.d.ts` (resolver type only · `sourceObservation` export 0)
- `services/market-intelligence/src/catalog-runtime-seed.cjs` (seed opportunity `staleAt = observedAt`)
- `tooling/verify/catalog-runtime-seed.cjs` (reprice / AS-OF lock)
- `tooling/verify/fixtures/migrations-applied.v1.json` (`committedUnapplied` 3 versions)
- `tooling/verify/migrations-applied-parity.cjs` (accounted file-only pending · versions[] unchanged)

`index.ts` kept GitHub-main omission of `user-opportunity-feed-policy` (file absent on origin/main).
`index.cjs` not transplanted (would require missing `source-observation`).

Not transplanted: profits UI, Home, wallet, match-result runtime, durable-persistence verify scripts that need isolated PG, plan-meta, secrets, tmp.

## Remote DB EXIT_GATE

Supabase MCP `list_tables` (public) after restore, before merge:

```text
source_observations = ABSENT
canonical_products = ABSENT
canonical_product_source_links = ABSENT
match_results = ABSENT
```

`apply_migration` calls = 0. PRODUCTION apply remains REL-701-DB.
Fixture `versions[]` still ends at `20260814140000`. The three new prefixes sit only in `committedUnapplied`.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/catalog-runtime-seed.cjs` | PASS |
| `node tooling/verify/migrations-applied-parity.cjs` | PASS (42 files · fixture 1:1 with committedUnapplied) |
| `CI=true pnpm verify:gate:fast` | PASS (19 steps) |
| `CI=true pnpm verify:gate:push` | PASS (26 steps) |
| GitHub `gate.yml` / `verify-gate` | PASS (`32388878034`) |

## Stage C — PR #3 merge

```text
PR = #3
PR_URL = https://github.com/phonarawd/AI-Profit-OS/pull/3
PR_HEAD_SHA = c3c3111193821805333972bba83f8e6a6d88bd89
VERIFY_GATE_STATUS = SUCCESS
CI_RUN = 32388878034
MERGE_METHOD = merge
MERGE_COMMIT = f53e182f291f8c941e33671371075dec19142d36
REMOTE_MAIN_BEFORE = db6db871a809c6748173d76430e2fe56c6b5484c
REMOTE_MAIN_AFTER = f53e182f291f8c941e33671371075dec19142d36
PR_STATE_AFTER = MERGED
ADMIN_BYPASS_USED = 0
FORCE_MERGE_USED = 0
```

Merge commit parents = `db6db87` (GitHub main) + `c3c3111` (PR head). Canonical GitHub ancestry preserved.

## Stage D — post-merge acceptance

Remote `main` compare `db6db87...f53e182`: 15 files = allowlist. No Home visual change. No feed-policy reintroduction. No `sourceObservation` MI export.

```text
PRODUCTION_MIGRATION_APPLY = REL-701-DB
APPLY_MIGRATION_CALLS = 0
UNRELATED_HISTORIES_MERGED = 0
FORCE_PUSH_USAGE = 0
LOCAL_MAIN_REWRITTEN = 0
PRESERVE_BRANCH_MERGED = 0
SECRET_RISK_STAGED = 0
```

REL-003 paths now present on remote `main`:

- `services/api-nest/src/opportunities/opportunity-reprice.service.ts`
- `supabase/migrations/20260819210000_source_observations.sql`
- `supabase/migrations/20260819220000_canonical_products.sql`
- `supabase/migrations/20260820013000_match_results.sql`

Preserve branch `preserve/2026-08-20-worktree-rescue` is not a merge parent.

REL-003 = PASS. Do not start REL-004.
