# Main branch merge-policy hardening proposal

Status: **PROPOSAL ONLY — NO RULESET / WORKFLOW MUTATION AUTHORIZED.**

This document records the current enforcement gap and a safe future design. It does not change GitHub rulesets, branch protection, workflows, Engine acceptance, or merge authorization.

## 1. Current live ruleset observation

Ruleset: `main-gate-required`

- target: `refs/heads/main`
- enforcement: active
- non-fast-forward protected
- deletion protected
- strict required status-check policy: true
- currently required status context: **`verify-gate` only**
- pull requests required, but approving-review count is currently 0
- repository-role bypass actor exists with `bypass_mode=always`

Operational consequence: a green `verify-gate` can satisfy GitHub's configured required status context even when a separate governance rule says a product PR must not merge yet. P0-C is the current example: code gate can be green while Engine certificate remains not issued.

## 2. Why simply requiring `engine-acceptance` globally is unsafe

Current `.github/workflows/engine-acceptance.yml` does **not** run on every pull request. Its PR trigger is path-filtered to Engine governance/tooling/workflow files.

A product PR that changes protected product code but not those trigger paths can have no `engine-acceptance` PR check at all.

Therefore adding `engine-acceptance` as a global required status context without first changing the trigger/aggregation design can create a merge deadlock: GitHub waits for a required context that was never created.

Do not solve this by broadening the Engine workflow casually. Its workflow hash and acceptance semantics are governed and any change must follow the controlled workflow-amendment path.

## 3. Why simply requiring `worldclass-ui` globally is unsafe

Current `consumer-spark-worldclass` PR workflow is also path-filtered. It runs for `apps/web/**`, `packages/ui/**`, and a small set of browser/verifier/workflow paths.

Backend-only, docs-only, ops-only, or other PRs may never create the worldclass context.

Therefore a global `worldclass-ui` required context can likewise remain permanently pending for irrelevant PRs.

## 4. Recommended target architecture: one always-created merge-policy context

Create a future dedicated PR workflow whose **single stable final job/context always exists for every PR targeting main**.

Conceptual name:

```text
merge-policy
```

Conceptual final required context:

```text
merge-policy
```

The workflow should not replace underlying tests. It should decide which evidence is required for the PR's changed-path/risk class and fail closed if required evidence is absent, stale, or belongs to another SHA.

### 4.1 Always-created contract

- trigger on every `pull_request` to `main`, no path filter on the final policy workflow,
- final `merge-policy` job always starts,
- paths determine **requirements**, not whether the final context exists,
- exact PR head SHA is the evidence key,
- missing required evidence = FAIL, never implicit PASS,
- skipped/not-applicable evidence is allowed only when path/risk classifier proves it is not applicable.

### 4.2 Proposed risk classes

#### Class A — ordinary non-protected, non-consumer changes

Require at minimum:
- current `verify-gate` success for exact head,
- no forbidden direct-main semantics,
- no unresolved policy classification error.

#### Class B — consumer UI changes

When changed paths include current consumer UI scope:
- require `verify-gate`,
- require worldclass browser/build/accessibility evidence for exact head,
- do not accept a run from an ancestor or stacked pre-retarget head,
- a missing worldclass run is FAIL at final merge-policy time.

#### Class C — Engine protected-product changes

When current protected-scope classifier says protected product bytes changed:
- require `verify-gate`,
- require current acceptance epoch identity to match the product head/manifest,
- require genuine Engine certificate/issuance state per current policy,
- `NOT_ISSUED`, `STALE`, predecessor verdict, or hash-washed evidence = FAIL,
- do not infer acceptance from runtime QA sub-jobs alone.

#### Class D — both consumer UI + protected product

Require both Class B and Class C evidence.

#### Class E — workflow/governance mutation

Require the normal gate plus the applicable workflow-amendment/governance contract. The merge-policy workflow must not silently bless a changed acceptance workflow hash.

## 5. Critical implementation constraint: avoid self-referential status polling traps

A merge-policy job that merely queries GitHub for another workflow's status can race with that workflow or require extra token permissions.

Safer implementation options should be evaluated in a separate controlled PR:

1. **Reusable-workflow orchestration:** the always-running policy workflow invokes the applicable underlying reusable verification workflows/jobs, then aggregates their outputs.
2. **Stable wrapper jobs:** always-created jobs exist and internally run or explicitly mark not-applicable based on changed-path classification.
3. **Artifact/evidence verification:** for governance suites that intentionally run separately, verify signed/hash-bound current-head evidence rather than accepting a job name alone.

Do not implement this by fabricating successful check-runs or by treating a missing external workflow as success.

## 6. Engine-specific governance boundary

The current Engine acceptance workflow is governed by hash/epoch rules. Any future change that makes its execution reusable, broadens triggers, or changes pass/fail semantics must use the existing controlled workflow-amendment process.

The merge-policy proposal must **consume** Engine truth, not weaken it.

In particular:

- `STATUS=NOT_ISSUED` must remain blocking for a protected-product merge policy,
- predecessor QA9 cannot become current by reference,
- rebase ACK remains Human/PO explicit,
- workflow hash changes cannot be smuggled into a generic branch-protection cleanup.

## 7. Worldclass-specific rule

For final consumer UI merge readiness, evidence must be from the actual final main-target head.

Stacked PRs such as #77 may legitimately have no worldclass PR run while targeting a non-main base. That is `NOT_RUN`, not PASS. After retarget/rebase to main, the final head must generate the required UI evidence before merge-policy can pass.

## 8. Bypass policy recommendation

Current live ruleset contains a repository-role actor with `bypass_mode=always`.

Do not remove or change bypass access automatically. A future owner-approved hardening review should determine:

- which emergency role genuinely requires bypass,
- whether `always` is necessary,
- whether bypass should be constrained to documented break-glass use,
- how bypass events are audited,
- whether production-sensitive merge procedures require an independent approval even when GitHub technically permits bypass.

Until then, governance must continue treating technical bypass capability as **not equivalent to authorization**.

## 9. Safe rollout sequence for future hardening

This proposal is **not** to be implemented during the current P0-C acceptance epoch.

Future controlled sequence:

1. Close and accept the current P0-C epoch without changing its acceptance rules underneath it.
2. Merge/settle current stacked product/UI work in the governed order.
3. On fresh main, design the always-created merge-policy workflow with deterministic changed-path classification.
4. Add self-tests proving ordinary/backend/UI/protected/both/workflow cases each produce the final context.
5. Prove a required applicable check cannot be skipped by path filters.
6. Prove a non-applicable check does not leave a permanent pending context.
7. Apply any Engine workflow change only through its separate amendment process.
8. Run the proposal on test PR fixtures before making it a required ruleset context.
9. Only after the stable context is proven should an explicitly authorized ruleset mutation add `merge-policy` as required.
10. Separately review bypass actors/modes.

## 10. Acceptance tests for the future merge-policy PR

At minimum, fixture PR/change sets must prove:

- docs-only/non-protected -> final context exists and can pass with ordinary gate,
- backend non-protected -> final context exists,
- consumer UI -> missing worldclass evidence fails,
- consumer UI -> exact-head worldclass evidence passes,
- protected product -> `NOT_ISSUED` fails,
- protected product -> stale/predecessor acceptance fails,
- protected product -> exact current issued epoch passes,
- combined UI+protected -> either missing side fails,
- workflow mutation -> amendment requirement enforced,
- stacked non-main PR -> no false PASS is inferred,
- retargeted final head -> evidence from old head rejected,
- bypass capability does not alter policy result.

## 11. Current recommendation

```text
RULESET_MUTATION_NOW = NO
ADD_ENGINE_ACCEPTANCE_AS_GLOBAL_REQUIRED_CONTEXT_NOW = NO
ADD_WORLDCLASS_AS_GLOBAL_REQUIRED_CONTEXT_NOW = NO
PREPARE_ALWAYS_CREATED_MERGE_POLICY_DESIGN = YES
CURRENT_VERIFY_GATE_REQUIRED = KEEP
HUMAN_PO_ACK_BOUNDARY = KEEP
```

The goal is to make GitHub enforcement eventually match the project's governance truth **without creating a path-filter deadlock or weakening Engine acceptance**.
