# Legacy/open PR reconciliation — 2026-08-26

Status: **READINESS / QUEUE HYGIENE ONLY.** This document does not authorize Engine ACK/rebase apply, merge of P0-C, production deploy, DB/secret mutation, ruleset mutation, or P0-D.

## 1. Snapshot anchors

Recalculate whenever a referenced head moves.

- `main` = `4abc40d3649392e81b471a57d7e9b43b5c63e780`
- PR #76 P0-C = `bbb7b18e30ec06d0895792731e4b794d4911e748`
- PR #77 premium UI = `ced4e34793257c34bb60ea88ff3efde17a5ad696`
- PR #78 FX release hardening before this document = `59304c3e5c7e85cecff2a87099a6ca142ee31c07`

Current release boundary remains:

- P0-C code is mergeable at the code level, but Engine certificate is not issued.
- Human/PO ACK remains a separate explicit boundary.
- P0-D remains not started.
- Production FX remains blocked by CoinGecko commercial-provider clearance and production Nest ingest proof.

## 2. Open-PR disposition matrix

| PR | Disposition | Why | Reuse rule |
| --- | --- | --- | --- |
| #78 | KEEP DRAFT | Current P0-C stacked release-readiness work; isolated from #77 direct paths | Rebase onto accepted main only after #76 is accepted/merged |
| #77 | KEEP DRAFT | Active Cursor premium consumer UI stacked on #75 | Do not edit from this ops track; validate final head after retarget/rebase |
| #76 | HOLD | Engine certificate not issued | No merge until true current-epoch acceptance and separate merge authorization |
| #75 | KEEP DRAFT | Isolated execution experience; zero direct #76 path overlap | Rebase onto accepted main, then integrate shared MoneyAmount without client FX math |
| #74 | CLOSE AS OBSOLETE EVIDENCE | Validation-only / DO NOT MERGE snapshot, superseded by later main/P0-B truth | Preserve PR history only |
| #72 | CLOSE AS OBSOLETE EVIDENCE | Validation-only / DO NOT MERGE snapshot, superseded by later main/P0-B truth | Preserve PR history only |
| #69 | REBUILD AFTER P0-C EPOCH CLOSE | Good user-safe KRW instructions design, but adds Nest protected paths and previously tripped REL-502 epoch drift | Recreate on then-current main as a new protected-product epoch |
| #68 | KEEP BLOCKED | Lighthouse work remains useful; BrowserStack cross-browser execution is provider-compatibility blocked while repository Playwright is newer than officially supported matrix | Re-evaluate when provider compatibility catches up; do not downgrade main Playwright merely to make it green |
| #63 | REBUILD, DO NOT MERGE AS-IS | UI concept is useful, but current Admin deposit-config GET returns the full `DepositConfigV1`, which includes security-sensitive/ref fields; hiding them in React is not a server-side data minimization boundary | Rebuild with an explicit safe Admin projection plus audited PATCH UI/tests after P0-C epoch closes |
| #50 | CLOSE CURRENT PR; REDESIGN CONCEPT | 125 commits behind, non-mergeable, overlaps P0-C protected files. Promotion code reads `fx_snapshots.usd_krw` and passes it as `usdtKrw`, reintroducing an implicit USDT==USD assumption forbidden by P0-C | Preserve only INSERT-only live-listing promotion intent; reimplement on current FX truth |
| #49 | CLOSE CURRENT PR; SALVAGE FEATURES | 125 commits behind and changes RBAC schema + multiple Nest protected paths. Several potentially useful backend features do not exist on current main | Rebuild selected features on current RBAC/route contracts after P0-C, never cherry-pick the old branch wholesale |
| #30 | CLOSE STALE BRANCH; PRESERVE FIGMA METADATA | 186 commits behind. Current registry evolved independently, but old PR contains Auth Figma candidate node metadata not currently represented in main registry | Recreate a metadata-only Figma reconciliation PR after #77 settles; candidate only, no retroactive authority |
| #1 | CLOSE AS OBSOLETE EVIDENCE | Verification-only / do-not-merge HomeClean snapshot, 295 commits behind current main | Preserve history only; do not revive old Home implementation |

## 3. PR #63 — Admin Money rebuild contract

### 3.1 What is worth preserving

- editable KRW bank name / account number / account holder / user notice,
- explicit change reason,
- confirmation before save,
- existing audited `PATCH /api/v1/admin/wallet/deposit-config`,
- fee / minimum holding / sweeper-pause controls already supported by the backend contract,
- explicit prohibition on shared USDT deposit-address editing,
- desktop + 390px Playwright coverage,
- PATCH payload assertion that no shared USDT address is introduced.

### 3.2 Newly identified server-side data-minimization blocker

Current `DepositConfigAdminController.get()` returns `DepositConfigService.get()` directly. `DepositConfigV1.usdtOnchain` includes fields such as:

- `tronGridApiKey?`,
- `hotWalletXpubRef`,
- `treasuryHotAddressRef`,
- infrastructure/runtime fields that the beginner Admin UI does not need.

Therefore, "React does not render the values" is not a sufficient security boundary; the browser can still receive the JSON.

### 3.3 Required redesign

Create a server-authored Admin-safe projection, for example conceptually:

- configVersion,
- KRW public/admin-editable fields,
- `network = TRC20`,
- `usdtWithdrawNetworkFeeUsdt`,
- `sweeperPaused`,
- `minHoldingHours`,
- non-secret connection booleans/status only when they are genuinely server-derived,
- updatedAt.

The Admin GET response must not include raw credential material or secret/reference identifiers that the page does not need. In particular, do not return `tronGridApiKey`, hot-wallet xpub references, treasury secret/address references, or unrelated security configuration merely because the underlying Money-owned object contains them.

PATCH remains an allowlisted partial update. Do not add editing for network, contract, shared address, confirmations, xpub/treasury refs, or secret material.

Because the safe projection requires Nest changes, treat this as a new protected-product epoch after the current P0-C epoch is closed.

## 4. PR #69 — User KRW deposit instructions

The design is worth preserving and is a good pattern for #63's future safe projection:

- JWT required,
- `DepositConfigService.requirePersisted()` only,
- Day-1 blank/default config never represented as a real bank account,
- explicit allowlist response only: `configVersion`, `bankName`, `accountNumber`, `accountHolder`, `noticeKo`, `updatedAt`,
- fail closed with not-ready when bank/account/holder is absent,
- consumer request action disabled unless instructions are ready,
- request remains distinct from credited balance,
- no hardcoded production account,
- no USDT secret/ref/admin/security fields in the public response.

Historical dedicated Money UX QA and worldclass UI were successful. The historical full gate failure was REL-502 epoch staleness, not evidence that this UX contract itself was functionally broken.

Do not merge the old branch. Recreate it after P0-C acceptance on the then-current main and run the full current acceptance/governance path required for its new protected Nest files.

## 5. PR #50 — Opportunity-promotion redesign contract

### 5.1 Preserve the product intent

- After honest live listing persistence/repricing, allow an asset with sufficient fresh comparable listings to become an opportunity.
- Promotion is INSERT-only for a missing opportunity; never overwrite an existing opportunity row merely because a listing refresh arrived.
- Keep fail-closed listing freshness, image/publication guards, and identity matching.
- Keep DB asset-master expansion as a separate, explicit concern rather than using query placeholders as assets.

### 5.2 Reject the old money implementation

The old service resolves:

```text
SELECT id, usd_krw ... FROM fx_snapshots
```

and then returns that value as `usdtKrw`. This is incompatible with current P0-C truth because it implicitly treats USD/KRW as USDT/KRW.

A future implementation must:

1. Consume the current trusted FX snapshot contract, not rename `usd_krw` into `usdtKrw`.
2. Use true USDT/KRW when present/derived under the current validated provider/provenance policy.
3. Never use a Day-1 seed as "current" conversion truth.
4. Fail closed for KRW approximation when trusted/fresh conversion is unavailable; USDT pricing remains authoritative.
5. Preserve per-leg freshness/provenance semantics.
6. Avoid browser/provider fan-out.
7. Make the emitted event/reference identify the actual persisted opportunity correctly rather than assuming asset id is always the event id contract.
8. Re-run current pricing, image, identity, Engine and money-truth tests on the newly integrated implementation.

The old PR must not be cherry-picked.

## 6. PR #49 — Admin control-plane salvage list

The old branch is too far behind and modifies current protected contracts, so it should not be rebased wholesale. Potentially useful features to rebuild separately are:

- server-verified Admin session/connection probe,
- searchable user directory backed by current read models,
- read-only withdrawal review visibility,
- action-first Admin counts and clearer adapter/source health,
- responsive beginner-oriented Admin presentation.

Before rebuilding any item:

- use the then-current AdminGuard/RBAC schema and route classifier,
- do not add write transitions merely because the old UI had an operational table,
- keep ledger/withdrawal money authority on the server,
- expose only the minimum fields each Admin surface needs,
- treat any Nest/RBAC schema change as protected-product work with its own acceptance implications.

## 7. PR #30 — Auth Figma metadata to preserve

Do not merge the 186-commit-old branch. Preserve these old candidate identifiers as historical/reconciliation input only; they are not approved authority merely because they existed in #30:

- login desktop `198:591`
- login mobile `199:523`
- signup desktop `200:527`
- signup mobile `201:539`
- complete-profile desktop `201:571`
- complete-profile mobile `201:604`
- onboarding desktop `201:635`
- onboarding mobile `201:672`
- auth flow `201:696`
- auth handoff `201:735`

Current main registry already has newer Account Hub V2.1 locked authority and runtime reconciliation. After #77 settles, re-read the live Figma file through the connected source and only then create a current metadata-only reconciliation PR. Never promote these old Auth candidates to Founder Approved or Code Connect applied by inference.

## 8. Recommended queue after P0-C acceptance

This is ordering guidance, not merge authorization.

1. Close current P0-C Engine epoch correctly and obtain a genuine certificate.
2. Merge #76 only with separate explicit merge authorization.
3. Rebase/validate #75 on accepted main; integrate shared MoneyAmount only through its money slots.
4. Retarget/rebase/validate #77 on the final #75/main line.
5. Rebase/validate #78 on accepted main; production FX still remains separately blocked until provider/Nest/ops prerequisites are satisfied.
6. Rebuild Admin Money (#63 concept) with a server-safe projection.
7. Rebuild user KRW instructions (#69 concept) on the resulting current epoch.
8. Rebuild selected Admin control-plane features (#49 concept) as small bounded PRs.
9. Reimplement live opportunity promotion (#50 concept) on current USDT/KRW/provenance truth.
10. Reconcile Auth Figma candidate metadata (#30 concept) against the live connected Figma source.
11. Re-evaluate #68 BrowserStack only when official compatibility supports the repository Playwright version or a separately isolated compatible runner is explicitly approved.

Do not batch steps 6-10 into the P0-C rebase just to reduce acceptance work; that would destroy epoch clarity and make provenance harder to audit.

## 9. Queue-hygiene close set

Safe-to-close as obsolete current PRs after this document preserves their disposition/history:

- #74 validation-only evidence,
- #72 validation-only evidence,
- #50 stale/non-mergeable implementation; concept preserved above,
- #49 stale/non-mergeable implementation; selected features preserved above,
- #30 stale/non-mergeable implementation; Auth Figma candidate metadata preserved above,
- #1 obsolete verification-only HomeClean evidence.

Closing a PR is not a claim that every historical idea was wrong. It prevents accidental future merge of stale branches while preserving their immutable Git/PR history.

## 10. Non-actions explicitly preserved

This reconciliation performs none of the following:

- Human/PO ACK,
- Engine rebase apply,
- certificate issuance,
- #76/#75/#77/#78 merge,
- main push,
- production deploy,
- production DB mutation,
- production secret mutation,
- branch/ruleset mutation,
- P0-D start.
