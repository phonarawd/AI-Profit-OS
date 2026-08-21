# REL-002 HOME CAPTURE + GITHUB TRANSPLANT EVIDENCE

```text
REL = REL-002
TITLE = Home 구현+승인 baseline 복원 (branch-PR-CI-merge)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-002
FIRST_EXECUTION_TODO = REL-003
DO_NOT_START_REL_003 = TRUE
```

## Stage A — original local capture

```text
SOURCE_BRANCH = recovery/home-capture
SOURCE_COMMIT = 219c64a0b0e87fdce10ae7c1433fbb0906402a1f
PARENT_COMMIT = 48ab180545c26881528902e880c1685e8d9798a0
SOURCE_PRESERVE_BRANCH = preserve/2026-08-20-worktree-rescue
SOURCE_PRESERVE_TIP = 88eca4468994ed427664f9b2c55e4bf336c79d58
WORKTREE = _tmp_rel002_home_capture
```

Local capture restore = bounded DIFF(48ab180 → 219c64a) on the 77-path allowlist.
`git add -A` / `git add .` / wildcard = 0.

## Stage B — GitHub-history transplant

```text
REMOTE_MAIN_BEFORE = 60914f4a1c1671a5bd3cf0ef4da248cab12abdf9
LOCAL_MAIN = 48ab180545c26881528902e880c1685e8d9798a0
RECOVERY_COMMIT = 219c64a0b0e87fdce10ae7c1433fbb0906402a1f
MERGE_BASE_PRESENT = FALSE
GITHUB_BASE_SHA = 60914f4a1c1671a5bd3cf0ef4da248cab12abdf9
NEW_BRANCH_NAME = rel/REL-002-home-baseline
NEW_BRANCH_PARENT_SHA = 60914f4a1c1671a5bd3cf0ef4da248cab12abdf9
WORKTREE = _tmp_rel002_github_main
PR_NUMBER = 2
PR_URL = https://github.com/phonarawd/AI-Profit-OS/pull/2
PR_HEAD_SHA = 1a4662ddfad6cfb5fd613cf481d25b751a055db8
CI_STATUS = SUCCESS
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32383942899
MERGE_COMMIT = db6db871a809c6748173d76430e2fe56c6b5484c
REMOTE_MAIN_AFTER = db6db871a809c6748173d76430e2fe56c6b5484c
```

Ancestry = `origin/main (60914f4) → 07e6fb8 (77 Home paths) → 1a4662d (current-fx export)`.
`48ab180` is not an ancestor of the PR head.

```text
UNRELATED_HISTORIES_MERGED = 0
FORCE_PUSH_USAGE = 0
LOCAL_MAIN_REWRITTEN = 0
PRESERVE_BRANCH_MERGED = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
UNEXPECTED_PATHS_STAGED = 0
```

## Phase 1 patch proof (48ab180 → 219c64a ∩ allowlist)

```text
PATCH_PATH_COUNT = 77
CLEAN_APPLY_PATH_COUNT = 76
CONFLICT_PATH_COUNT = 1
REMOTE_ONLY_COLLISION_COUNT = 0
REL003_PATH_LEAK_COUNT = 0
```

The one conflict path = `apps/web/app/page.tsx`.

Inspected individually:

- origin/main = `HomePageClient` + session cookie (legacy HomeExperience presentation)
- 48ab180 = `PendingFigma`
- 219c64a / freeze `productionHome.client` = `HomeDesktopClient`

Resolution = transplant Founder-approved `/` wiring to `HomeDesktopClient`.
`HomePageClient.tsx` was kept on GitHub (not deleted). No hybrid merge. No visual redesign.

## GitHub transplant path set

Product allowlist = 77 paths in `REL-002-ALLOWLIST.txt`.

CI-required Home compile dependency added on the GitHub-main branch only (not in 48ab180→219c64a because it already existed on local main):

- `packages/sdk/package.json` (`./current-fx` export only)
- `packages/sdk/src/current-fx/index.ts`
- `packages/sdk/src/current-fx/types.ts`
- `packages/sdk/src/current-fx/fetch.ts`

First CI run `32383502892` failed at `next-build`: `Can't resolve '@aipo/sdk/current-fx'`.
That module is named in Home freeze `productionHome.financialOwner`. Runtime already treats FX fetch failure as null (missing → 0 forbidden stays in `map-runtime`).

Not transplanted: profits, room, wallet UI, Track A migrations, opportunities, opportunity-reprice, match-result, tmp, secrets, plan-meta, PUTDUK_RELEASE_MASTER.plan.md, unused sneaker intermediates.

## Home authority

```text
HOME_FREEZE_PRESENT = TRUE
HOME_AUTHORITY_CHANGED = FALSE
HOME_RETROACTIVE_VISUAL_REDESIGN = 0
FIGMA_BACKUP_PROMOTED_TO_AUTHORITY = 0
HOME_PRODUCT_CONTRACT_VERIFIER_AUTHORITY = NON_GATE
```

Freeze JSON + HomeDesktop/HomeMobile/HomeDesktopClient blobs on the GitHub branch match `219c64a`.

## VERIFY

| command | result |
|---|---|
| `pnpm verify:home-live-wire` | PASS |
| `pnpm verify:home-product-contract` | FAIL — NON_GATE. CATALOG = historical/reference only, not T0/T1/T2-wired. Visual-fixture literal scan. Not repaired. |
| `CI=true pnpm verify:gate:fast` | PASS (canonical CI skip home-mirror; isolation not weakened) |
| `pnpm verify:gate:push` | PASS |
| GitHub `gate.yml` / `verify-gate` | PASS (`32383942899`) |

## Stage C — ruleset contract repair (pre-existing governance mismatch)

Read-only confirmation then one-field mutation of repository ruleset `main-gate-required`.

```text
REPOSITORY = phonarawd/AI-Profit-OS
RULESET_ID = 20576556
RULESET_NAME = main-gate-required
RULESET_ACTIVE = TRUE
TARGET_REF = refs/heads/main
OLD_REQUIRED_CHECKS = ["gate / verify-gate"]
ACTUAL_PR2_CHECKS = ["verify-gate"]
NEW_REQUIRED_CHECKS = ["verify-gate"]
OLD_BAD_CONTEXT_PRESENT = FALSE
VERIFY_GATE_REQUIRED = TRUE
UNRELATED_RULESET_FIELD_CHANGES = 0
```

GitHub required-status-check context for a normal workflow is the job/check name (`verify-gate`), not `<workflow> / <job>` (`gate / verify-gate`).

Preserved unchanged:

- enforcement = active
- target = `refs/heads/main`
- deletion protection
- non_fast_forward / force-push protection
- `strict_required_status_checks_policy = true`
- `do_not_enforce_on_create = true`
- pull_request parameters (review count 0, dismiss stale, allowed methods merge/squash/rebase)
- pre-existing bypass_actors (`RepositoryRole` 5 / always) — recorded only, not used
- no extra required checks added or removed
- ruleset not disabled or deleted

Classic branch protection on `main` = none (404). Governance is this ruleset only.

Machine copy: `governance/release-master/REL-002-RULESET-REPAIR.json`

## Stage D — PR #2 recheck + normal merge

```text
PR = #2
PR_URL = https://github.com/phonarawd/AI-Profit-OS/pull/2
PR_HEAD_SHA = 1a4662ddfad6cfb5fd613cf481d25b751a055db8
VERIFY_GATE_STATUS = SUCCESS
CI_RUN = 32383942899
MERGE_STATE_BEFORE = BLOCKED
MERGE_STATE_AFTER_RULESET_REPAIR = CLEAN
ADMIN_BYPASS_USED = 0
FORCE_MERGE_USED = 0
MERGE_METHOD = merge
MERGE_COMMIT = db6db871a809c6748173d76430e2fe56c6b5484c
REMOTE_MAIN_BEFORE = 60914f4a1c1671a5bd3cf0ef4da248cab12abdf9
REMOTE_MAIN_AFTER = db6db871a809c6748173d76430e2fe56c6b5484c
PR_STATE_AFTER = MERGED
```

`gh pr merge 2 --merge` only. No `--admin`, no bypass mode, no force merge, no dummy commit, no replacement PR, no workflow rewrite to manufacture the old incorrect context.

Merge commit parents = `60914f4` (GitHub main) + `1a4662d` (PR head). Canonical GitHub ancestry preserved.

## Stage E — post-merge acceptance

Remote `main` compare `60914f4...db6db87`: 81 files = 77 Home allowlist + 4 documented `current-fx` compile deps. No visual redesign in the ruleset-repair session.

```text
HOME_FREEZE_PRESENT = TRUE
HOME_AUTHORITY_CHANGED = FALSE
HOME_RETROACTIVE_VISUAL_REDESIGN = 0
FIGMA_BACKUP_PROMOTED_TO_AUTHORITY = 0
HOME_PRODUCT_CONTRACT_VERIFIER_AUTHORITY = NON_GATE
PRODUCTION_HOME_CLIENT = apps/web/app/HomeDesktopClient.tsx
FOUNDER_APPROVED = TRUE
HOME_PRESENTATION_BASELINE = LOCKED
DID_NOT_PROMOTE_STALE_FIGMA = TRUE
```

Remote `/` on `main` is `HomeDesktopClient`. Freeze JSON `verdict.founderApproved = true`.

```text
UNRELATED_HISTORIES_MERGED = 0
FORCE_PUSH_USAGE = 0
LOCAL_MAIN_REWRITTEN = 0
PRESERVE_BRANCH_MERGED = 0
REL003_PATH_LEAK_COUNT = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
```

REL-003 paths absent from the merge and from remote `main`:

- `services/api-nest/src/opportunities/opportunity-reprice.service.ts` = 404
- `supabase/migrations/20260819210000_source_observations.sql` not in merge files
- `supabase/migrations/20260819220000_canonical_products.sql` not in merge files
- `supabase/migrations/20260820013000_match_results.sql` not in merge files

Preserve branch `preserve/2026-08-20-worktree-rescue` is not a merge parent.

REL-002 = PASS. Do not start REL-003.
