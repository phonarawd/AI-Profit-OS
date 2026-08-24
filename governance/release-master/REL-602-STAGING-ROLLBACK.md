# REL-602 — Staging rollback practice

```text
STATUS = COMPLETED
ACCEPTANCE_MET = 1
ROLLBACK_EXECUTED = 1
FORWARD_DEPLOY_EXECUTED = 1
STAGING_ONLY = 1
PRODUCTION_DOMAIN_UNCHANGED = 1
PRODUCTION_WORKFLOW_DISPATCH = 0
PRODUCTION_DB_MUTATION = 0
APPLY_MIGRATION = 0
MONEY_MUTATION = 0
LEDGER_BALANCE_UPDATE = 0
HOME_VISUAL_REDESIGN = 0
FAKE_PASS = 0
```

## Scope

REL-602는 production rollback이 아니라 **Cloudflare preview Workers staging에서 실제 rollback → read-only regression → forward deploy**를 수행하는 연습이다.

- web staging: `https://ai-profit-web-preview.ebay-adapter.workers.dev`
- ops staging: `https://ai-profit-ops-preview.ebay-adapter.workers.dev`
- allowed Workers: `ai-profit-web-preview`, `ai-profit-ops-preview`
- production Workers / custom domains / DB / migrations / ledger mutation: 범위 밖

## Execution evidence

Final successful GitHub Actions run:

- workflow: `REL-602 staging rollback once`
- run id: `32718187604`
- run number: `3`
- branch head used by the run: `532c087f567d87b41f469ecd0fbd3de188077694`
- job: `staging-rollback-drill`
- job id: `97403809791`
- conclusion: `success`
- artifact id: `9516804405`
- artifact name: `rel-602-staging-rollback-evidence`
- artifact digest: `sha256:5568df31b0923d849d062eeb99514af3214955526aa9f07391ae4be104ce5e0e`
- artifact files: `rel602-web-before.json`, `rel602-ops-before.json`, `rel602-web-rollback.json`, `rel602-ops-rollback.json`, `rel602-web-forward.json`, `rel602-ops-forward.json`

### Before rollback — current PR staging

| surface | active version | percentage |
|---|---|---:|
| web | `27d770fa-5c12-4ad3-8a77-a7cc6cb9eeb5` | 100 |
| ops | `56b2fb91-1f06-4bf7-8a52-384deaaa73a5` | 100 |

### Proven prior staging state selected for rollback

The prior pair was established by read-only Cloudflare inventory run `32718011944`: these were the last active preview deployments before PR #53 first deployed to staging.

| surface | rollback target | prior active deployment time (UTC) |
|---|---|---|
| web | `8306d58e-b6ab-46fb-bd49-d1e240778fb7` | `2026-08-24T06:50:12.886398Z` |
| ops | `eaf10c40-6d5d-4920-96ad-626aeb8f6b4b` | `2026-08-24T05:36:31.812001Z` |

The rollback helper performed an atomic preflight first: **both target version IDs had to be present in the current deployable version sets before either rollback mutation could start.**

### Rollback active state

Cloudflare rollback completed for both preview Workers:

- web → `8306d58e-b6ab-46fb-bd49-d1e240778fb7` OK
- ops → `eaf10c40-6d5d-4920-96ad-626aeb8f6b4b` OK

Post-rollback deployment status recorded both target IDs at `percentage = 100`.

Read-only validation after rollback:

- `cf-origin-smoke`: web `200`, ops `307` PASS
- `verify:rel-601-staging-regression`: PASS
- Home / profits / trades / wallet / auth / account / Admin Surface Matrix probes: PASS
- money mutation: 0

### Forward deploy

The same PR head was then deployed forward to preview Workers again.

| surface | active forward version | percentage |
|---|---|---:|
| web | `01c30363-1f5f-44fb-8ec8-9e82af75d498` | 100 |
| ops | `098be5ee-76db-40ac-9de7-4a20ace48812` | 100 |

Both forward IDs differ from the rollback targets. `cf-origin-smoke` and the full REL-601 read-only staging regression passed again after the forward deploy.

## Failed-attempt audit trail

Two earlier PR #53 attempts were intentionally fail-closed and are **not** counted as acceptance:

1. historical REL-600 candidate IDs were no longer in the deployable version set;
2. later historical IDs were also no longer deployable.

Both attempts stopped during target-presence validation with `MUTATION = 0`; no partial rollback occurred. The helper was then strengthened so web+ops target presence is validated before either mutation.

## Production boundary

REL-602 did **not**:

- dispatch the production Cloudflare workflow;
- deploy `ai-profit-web` or `ai-profit-ops`;
- change `app.hiptk.app` or `ops.hiptk.app`;
- apply or revert any database migration;
- write money/ledger balances;
- create or move a production release tag.

Production rollback remains governed by REL-403 release identity and the production rules in `ROLLBACK_RUNBOOK.md`. This REL proves the rollback mechanism only on the staging preview slots.
