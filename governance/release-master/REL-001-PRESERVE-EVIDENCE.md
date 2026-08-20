# REL-001 PRESERVE EVIDENCE

```text
REL = REL-001
STATUS = PASS
PRESERVE_BRANCH = preserve/2026-08-20-worktree-rescue
PRESERVE_COMMIT = ae8d1e634cb07998982997bb520396b825a7a42e
PARENT_COMMIT = 48ab180545c26881528902e880c1685e8d9798a0
MAIN_HEAD = 48ab180545c26881528902e880c1685e8d9798a0
MERGE_TO_MAIN = FORBIDDEN
BACKUP_AUTHORITY_ONLY = TRUE
```

This branch is recovery/backup authority only. Do not open a PR. Do not merge to main.

Input inventory = REL-000 only.

## Counts

| metric | value |
|---|---|
| RECOVERABLE_EXPECTED | 151 |
| RECOVERABLE_PRESERVED | 151 |
| COMMIT_DELTA_PATHS | 145 |
| ALREADY_IN_PARENT_NO_DELTA | 6 |
| SECRET_CONTENT_READ_COUNT | 0 |
| SECRET_RISK_STAGED | 0 |
| SECRET_RISK_IN_COMMIT | 0 |
| GIT_ADD_A_USAGE | 0 |
| DESTRUCTIVE_GIT_OPERATION | 0 |
| PRODUCT_CODE_MUTATION_BY_REL001 | 0 |

Staging method = `git add --pathspec-from-file=governance/release-master/REL-001-ALLOWLIST.txt` (exact paths). `git add -A` / `git add .` / wildcard = 0.

The 6 wallet pages were REL-000 tracked-modified but had no content delta vs `main` after index refresh (CRLF/stat only). They remain in the preserve tree via parent `48ab180`.

## Secret-risk (path only · contents not read · not staged · not committed)

- `.env`
- `.cursor/secrets/github-ai-profit-os.pat`
- `.cursor/secrets/github-clime.pat`

`github-clime.pat` was treated as a filename recorded by REL-000. Isolation: no open, no compare, no copy, no execute.

## Critical path presence in preserve tree

| group | in_tree |
|---|---|
| home-freeze (HomeDesktop/HomeMobile/HomeDesktopClient/freeze rule+JSON) | TRUE |
| spark-dash | TRUE |
| opportunities | TRUE |
| opportunity-reprice.service.ts | TRUE |
| migrations 3 | TRUE |

## VERIFY

```text
STAGED_SECRETS = 0
HOME_PROFITS_REPRICE_MIGRATION_IN_TREE = TRUE
MERGE_TO_MAIN = 0
verify:secrets = PASS
pnpm verify:gate:fast = PASS
```

## ACCEPTANCE

```text
BACKUP_BRANCH_EXISTS = TRUE
SECRETS_EXCLUDED = TRUE
MAIN_TREE_COMMIT_UNCHANGED = TRUE
COMMIT_ONLY_ON_PRESERVE_BRANCH = TRUE
```

Machine copy: `governance/release-master/REL-001-PRESERVE-EVIDENCE.json`
