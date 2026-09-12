# LIVE_RULESET_BACKEND_REQUIRED evidence — 2026-09-12

```text
ACK = LIVE_RULESET_BACKEND_REQUIRED
ACK_USED = 1
GREEN_SHA = bceb1867f06be5e2a46977b4e894588e788c2922
BACKEND_REQUIRED_GREEN = 1
SAME_SHA_BACKEND_CI_3X = 1
HAND_PARTIAL_RULE_OVERWRITE = 0
AIPO_APPLY_LIVE_RULESET = 1
OFFICIAL_SCRIPT = tooling/github/apply-main-gate.ps1
MAIN_RULESET_ID = 20576556
MAIN_PUT = 1
MAIN_CONTEXT_BEFORE = verify-gate
MAIN_CONTEXT_AFTER = backend-required
MAIN_UPDATED_AT = 2026-09-12T16:47:10.712+09:00
RELEASE_TRAIN_ID = 21919415
RELEASE_TRAIN_PUT = 0
RELEASE_TRAIN_CONTEXT = verify-gate
RELEASE_TRAIN_BLOCK = tool_policy_GitHub_ruleset_mutation
MERGED = NO
DEPLOYED = NO
PROD_DB_CHANGED = NO
```

## Pre-PUT live rules (GET 20576556)

- rules types: deletion, non_fast_forward, required_status_checks, pull_request
- required context: `verify-gate`
- pull_request.require_extra_approval_for_unattributed_changes: true
- bypass: RepositoryRole 5 always
- conditions.include: refs/heads/main

Draft `tooling/github/main-gate.ruleset.json` was missing `required_reviewers` and `require_extra_approval_for_unattributed_changes`. Those live fields were copied into the draft before PUT. Context was the only intended change.

## POST-PUT live rules (GET 20576556)

- required context: `backend-required`
- rule types unchanged (4)
- pull_request.require_extra_approval_for_unattributed_changes: true
- conditions unchanged
- bypass unchanged

## Same-SHA backend-ci (count only SUCCESS)

| # | run | event | conclusion |
|---|---|---|---|
| 1 | 34680893564 | pull_request | success |
| 2 | 34681005678 | workflow_dispatch | success |
| 3 | 34681097690 | workflow_dispatch | success |

Failed runs on older SHAs are not counted.

## Release-train 21919415

Official-basis §9.1.4 requires the same rules body with live conditions. A full-body PUT was attempted after main PUT. The local tool policy blocked `GitHub ruleset mutation` on that second call. Live 21919415 still has context `verify-gate`. Do not treat the pair as complete.

## Not done

- PR merge
- production deploy
- production DB
- engine-acceptance.yml edit
- current-epoch QA1-QA9 re-issue
