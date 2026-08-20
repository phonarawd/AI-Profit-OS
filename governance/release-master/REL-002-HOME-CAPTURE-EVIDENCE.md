# REL-002 HOME CAPTURE EVIDENCE

```text
REL = REL-002
TITLE = Home 구현+승인 baseline 복원 (branch-PR-CI-merge)
STATUS = PARTIAL
BRANCH = recovery/home-capture
PARENT_COMMIT = 48ab180545c26881528902e880c1685e8d9798a0
SOURCE_PRESERVE_BRANCH = preserve/2026-08-20-worktree-rescue
SOURCE_PRESERVE_TIP = 88eca4468994ed427664f9b2c55e4bf336c79d58
RESTORE_TREE = ae8d1e634cb07998982997bb520396b825a7a42e (Home bytes unchanged at tip)
WORKTREE = _tmp_rel002_home_capture
MERGE_TO_MAIN = BLOCKED
```

## Scope

Restore method = `git restore --source=preserve/2026-08-20-worktree-rescue --staged --worktree --pathspec-from-file=governance/release-master/REL-002-ALLOWLIST.txt`

`git add -A` / `git add .` / wildcard = 0.

| metric | value |
|---|---|
| REL002_EXPECTED_PATHS | 77 product/governance + 1 allowlist + 1 evidence |
| REL002_INTEGRATED_PATHS | same |
| UNEXPECTED_PATHS_STAGED | 0 |
| REL003_PATH_LEAK_COUNT | 0 |
| SECRET_CONTENT_READ_COUNT | 0 |
| SECRET_RISK_STAGED | 0 |
| GIT_ADD_A_USAGE | 0 |
| DESTRUCTIVE_GIT_OPERATION | 0 |
| HOME_FREEZE_PRESENT | TRUE |
| HOME_AUTHORITY_CHANGED | FALSE |
| HOME_RETROACTIVE_VISUAL_REDESIGN | 0 |
| FIGMA_BACKUP_PROMOTED_TO_AUTHORITY | 0 |

Intentionally not restored: profits/room, wallet, Track A migrations, opportunities, opportunity-reprice, match-result, capture/debug scripts, unused sneaker intermediates, tmp, secrets, plan-meta, PUTDUK_RELEASE_MASTER.plan.md.

## Freeze

`governance/consumer-home-approval/home-approval-freeze.v1.json`:

- founderApproved = true
- homePresentationBaseline = LOCKED
- desktopPrimary = 1440×1080
- mobilePrimary = 390×693
- HomeDesktop / HomeMobile / HomeDesktopClient / freeze JSON byte-identical to preserve

## VERIFY

| command | result |
|---|---|
| pnpm verify:home-live-wire | PASS (PendingFigma.tsx keeps greenfield skip; production `/` uses HomeDesktopClient) |
| pnpm verify:home-product-contract | FAIL — historical/reference only, execution authority 0, not T0/T1/T2-wired. Missing `packages/ui/canon/contracts/peotteok-home-product-contract.v1.md` already on parent main. Not repaired (would invent legacy Visual Master contract). |
| pnpm verify:gate:fast | FAIL locally on plans-ssot home-mirror (CURSOR_SYNC_PLANS=DISABLED_UNDER_CURRENT_ISOLATION). PASS with CI=true (script official CI path, 8 steps). |

## PR / merge blocker

Local `main` root `6cf3e03` (29 commits, HEAD 48ab180) and GitHub `phonarawd/AI-Profit-OS` `main` root `e38613f` (167 commits, HEAD 60914f4) are unrelated histories.

- `48ab180` is not on GitHub
- merge-base empty
- GitHub `main` still carries superseded Home V2 / Visual Master commits
- `gate.yml` only runs on `push`/`pull_request` to GitHub `main`
- Opening a PR from this branch into GitHub `main` would mix unrelated histories
- Force-push to `main` is forbidden

Therefore PR URL = none. MERGE_COMMIT = none. Local `main` left at 48ab180.
