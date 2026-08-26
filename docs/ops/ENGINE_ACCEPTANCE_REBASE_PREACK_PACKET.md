# ENGINE_ACCEPTANCE_REBASE_V1 pre-ACK execution packet

Status: **PREPARATION ONLY — this file is not Human/PO ACK, does not authorize apply, and does not authorize merge or production deployment.**

Snapshot date: 2026-08-26.

## 1. Current snapshot anchors

Re-read every value from live GitHub immediately before use. If any anchor moved, this packet is stale and must be regenerated.

- current main: `4abc40d3649392e81b471a57d7e9b43b5c63e780`
- P0-C PR #76 HEAD / proposed product commit: `bbb7b18e30ec06d0895792731e4b794d4911e748`
- predecessor baseline: `ea-baseline-04ef3c7de4dd-2ff1760b7d72`
- predecessor protected aggregate: `2ff1760b7d721205657991e1c775bf95fea4ae944dfb8e23a5b85de9813a36e8`
- current observed protected aggregate: `4f9d46aa712f5ccb8c4551b5eaa8bf4b6bea15207f3a4da3199e140664bdea46`
- current observed protected path count: `451`
- predecessor path count: `450`
- observed changed protected paths: `10`

## 2. Protected-path provenance split

### P0-B production provenance — 2 protected paths

1. `services/api-nest/src/config/nest-provenance.ts`
2. `services/api-nest/src/health.controller.ts`

The introducing P0-B commit identifies these as Render/Nest production provenance needed to expose a machine-verifiable deployed SHA.

### P0-C current-FX / KRW money — 8 protected paths

1. `schemas/current-fx-approx.v1.json`
2. `services/api-nest/src/adapters/adapters.admin.service.ts`
3. `services/api-nest/src/opportunities/current-fx-approx.service.ts`
4. `services/api-nest/src/opportunities/current-fx-approx.user.controller.ts`
5. `services/api-nest/src/opportunities/fx-snapshot.service.ts`
6. `services/api-nest/src/opportunities/opportunities.mi.ts`
7. `services/api-nest/src/opportunities/opportunities.user.service.ts`
8. `services/api-nest/tsconfig.json`

Do not collapse the two provenance groups into an opaque ten-path reason.

## 3. Exact ACK validator contract

The current rebase validator requires all of the following in the Human/PO statement:

- literal `ACK`
- literal `APPROVED`
- literal `ENGINE_ACCEPTANCE_REBASE_V1`

Korean `승인` alone does **not** satisfy the current code because the validator explicitly tests the English `APPROVED` token.

A future valid statement may use this exact shape **only when the Human/PO actually chooses to authorize it**:

`ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1: protected-scope drift 10 paths (P0-B production provenance 2 + P0-C current-FX/KRW 8)를 확인했으며 current live aggregate 기준 새 acceptance epoch rebase와 current-epoch QA1-QA8 재실행 후 QA9 재집계를 승인합니다. predecessor baseline/evidence/hash washing은 금지합니다.`

Copying this text into a prompt, report, issue, or this document is **not** ACK. ACK exists only when the Human/PO explicitly sends/records it as approval.

## 4. Explicit non-protected support paths

The rebase CLI currently falls back to historical `services/ai-platform/src/index.d.ts` when no `--support-path` is supplied. That default is unrelated to the P0-B + P0-C epoch and must not be allowed to silently become current provenance.

At this snapshot, use explicit support paths representing the actual companion implementation/verification. Re-derive them if #76 HEAD changes.

### P0-B support

- `.github/workflows/provision-ebay-adapter-secrets.yml`
- `tooling/deploy/cf-ebay-secrets.cjs`
- `tooling/verify/p0-ebay-secret-provisioning.cjs`
- `tooling/verify/nest-production-provenance.cjs`

### P0-C provider / policy / product support

- `services/market-intelligence/src/fx-display-policy.cjs`
- `services/market-intelligence/src/fx-ingest-decision.cjs`
- `workers/coingecko-adapter/src/client.ts`
- `workers/coingecko-adapter/src/index.ts`
- `workers/coingecko-adapter/wrangler.toml`
- `workers/frankfurter-adapter/src/client.ts`
- `workers/frankfurter-adapter/src/index.ts`
- `workers/frankfurter-adapter/wrangler.toml`
- `packages/sdk/src/current-fx/types.ts`
- `packages/ui/components/money/MoneyAmount.tsx`
- `packages/ui/copy/ko/money.ts`
- `packages/ui/components/shell/SiteFooter.tsx`
- `apps/web/lib/current-fx-refresh.ts`
- `apps/web/lib/start-fx-background-refresh.ts`
- `tooling/verify/p0-c-free-fx-krw-money.cjs`
- `.github/workflows/gate.yml`

These are provenance/support paths, not an assertion that they are the only non-protected files changed by #76.

## 5. Future dry-run command template

Do **not** run this until a real Human/PO ACK exists and live anchors have been re-read. The first authorized execution must be dry-run only.

```bash
node tooling/engine-acceptance/rebase-acceptance-baseline.cjs \
  --dry-run \
  --predecessor ea-baseline-04ef3c7de4dd-2ff1760b7d72 \
  --product-commit bbb7b18e30ec06d0895792731e4b794d4911e748 \
  --ack-by "Human/PO" \
  --ack-statement "<EXACT ACK APPROVED ENGINE_ACCEPTANCE_REBASE_V1 STATEMENT ACTUALLY RECEIVED>" \
  --support-path .github/workflows/provision-ebay-adapter-secrets.yml \
  --support-path tooling/deploy/cf-ebay-secrets.cjs \
  --support-path tooling/verify/p0-ebay-secret-provisioning.cjs \
  --support-path tooling/verify/nest-production-provenance.cjs \
  --support-path services/market-intelligence/src/fx-display-policy.cjs \
  --support-path services/market-intelligence/src/fx-ingest-decision.cjs \
  --support-path workers/coingecko-adapter/src/client.ts \
  --support-path workers/coingecko-adapter/src/index.ts \
  --support-path workers/coingecko-adapter/wrangler.toml \
  --support-path workers/frankfurter-adapter/src/client.ts \
  --support-path workers/frankfurter-adapter/src/index.ts \
  --support-path workers/frankfurter-adapter/wrangler.toml \
  --support-path packages/sdk/src/current-fx/types.ts \
  --support-path packages/ui/components/money/MoneyAmount.tsx \
  --support-path packages/ui/copy/ko/money.ts \
  --support-path packages/ui/components/shell/SiteFooter.tsx \
  --support-path apps/web/lib/current-fx-refresh.ts \
  --support-path apps/web/lib/start-fx-background-refresh.ts \
  --support-path tooling/verify/p0-c-free-fx-krw-money.cjs \
  --support-path .github/workflows/gate.yml
```

## 6. Dry-run acceptance checks

Before considering `--apply`, the dry-run must prove all of the following against the then-current repository state:

- predecessor id is still the current baseline id
- product commit is the exact intended #76/final product commit
- protected tree is clean
- computed changed protected paths are the expected current set
- new baseline id differs from predecessor
- eval dataset status is valid under the current rebase policy
- acceptance workflow hash matches the approved current acceptance workflow
- rebase policy is `ENGINE_ACCEPTANCE_REBASE_POLICY_V2`
- no historical baseline is rewritten
- no unrelated default support path is silently inserted
- command exits with `DRY-RUN OK (no writes)`

If any check differs, stop and regenerate this packet rather than editing evidence to fit the expectation.

## 7. Apply and rerun boundary

`--apply` remains forbidden by this preparation packet. Only after the Human/PO ACK exists and the dry-run is independently reviewed may the official apply path be considered.

After a valid apply, current policy requires fresh discovery evidence for QA1, QA2, QA3, QA4, QA5, QA6, QA7 and QA8. QA9 is an aggregation phase: it remains stale until current-epoch discovery evidence exists and must be recomputed afterward. A predecessor QA9 verdict must never be presented as current.

Engine certificate issuance, PR #76 merge authorization, production deploy authorization, secrets, DB changes and P0-D are all separate boundaries.
