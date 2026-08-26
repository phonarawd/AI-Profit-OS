# Post-P0-C rebuild execution packets

Status: **PREPARED / NOT STARTED.** These packets are future execution instructions only. They do not authorize P0-C Engine ACK/rebase apply, merge, production deploy, DB/secret mutation, branch-protection mutation, or P0-D.

Always re-read `main`, PR #76/#75/#77/#78 heads and current protected-scope policy before using any packet. Never reuse the snapshot SHA as an execution base after it becomes stale.

## Global execution order

1. P0-C current epoch genuinely accepted/certified.
2. PR #76 separately authorized and merged.
3. #75 rebased/validated/integrated on accepted main.
4. #77 rebased/retargeted and final-head UI QA completed.
5. #78 rebased/validated on accepted main; production FX still separately blocked until provider/Nest/ops prerequisites clear.
6. Then execute the bounded rebuild packets below **one protected epoch at a time**.

Do not combine these packets into one giant PR to save CI time. Epoch clarity and rollback isolation are more important.

---

# PACKET A — Admin Money safe deposit settings rebuild (#63 concept)

## Preconditions

- Current P0-C acceptance epoch is closed.
- Then-current `main` SHA has been freshly read.
- Current AdminGuard/RBAC and deposit-config contracts have been re-read from that SHA.
- Do not reuse old #63 branch as the base.

## Goal

Provide a beginner-friendly Admin KRW deposit-settings editor **without sending unnecessary secret/reference fields to the browser**.

## Required architecture

1. Add a server-authored Admin-safe read projection/DTO for deposit settings.
2. Return only fields the Admin page genuinely needs, such as:
   - `configVersion`
   - KRW `bankName`, `accountNumber`, `accountHolder`, `noticeKo`, `krwWithdrawFeeKrw`
   - safe `network` display (TRC20 invariant)
   - `usdtWithdrawNetworkFeeUsdt`
   - `sweeperPaused`
   - `minHoldingHours`
   - `updatedAt`
   - optional non-secret connection/status booleans only if genuinely server-derived.
3. Do **not** return raw or reference forms of:
   - TronGrid API key,
   - hot-wallet xpub references,
   - treasury secret/address references,
   - shared USDT deposit address,
   - unrelated infrastructure/security configuration.
4. Keep PATCH as an explicit allowlisted partial update.
5. Do not make network/contract/confirmations/xpub/treasury refs editable.
6. Preserve server audit trail and minimum change-reason policy.
7. Preserve confirmation before a bank-account save that can affect the user-facing deposit flow.

## UI requirements

- plain Korean for beginner admins,
- bank/account/holder/notice fields,
- fees/min holding/sweeper pause only when backend contract supports them,
- clearly state USDT deposit addresses are per-user/automated and not manually edited here,
- no dev/test/pro jargon in production Admin UI,
- 390px mobile + desktop layout,
- visible focus, touch targets, accessible labels/status.

## Forbidden

- No hardcoded production bank account.
- No secret display/logging.
- No shared USDT address editor.
- No direct production DB mutation.
- No implicit `unknown = connected` status.
- No reuse of full `DepositConfigV1` as a browser response merely because UI hides fields.

## Required tests

- server projection allowlist test proving forbidden fields cannot escape,
- AdminGuard/RBAC denial test,
- PATCH payload allowlist test,
- change-reason validation,
- audit write contract test with isolated DB fixture where applicable,
- desktop + 390px Playwright,
- horizontal-overflow check,
- keyboard/focus + axe blocking-regression check,
- current Nest build,
- current gate tier required for protected-product work,
- current Engine acceptance process for the resulting protected-scope mutation.

## Completion report

Report exact final HEAD and only evidence-backed values:

```text
ADMIN_SAFE_PROJECTION = PASS|FAIL
FORBIDDEN_SECRET_FIELDS_IN_BROWSER_RESPONSE = 0|NONZERO
SHARED_USDT_ADDRESS_EDITOR = ABSENT|PRESENT
AUDITED_PATCH = PASS|FAIL
MOBILE_390 = PASS|FAIL|NOT_RUN
ACCESSIBILITY = PASS|FAIL|NOT_RUN
ENGINE_EPOCH_STATUS = <actual>
PRODUCTION_MUTATION = 0
```

---

# PACKET B — User KRW deposit instructions rebuild (#69 concept)

## Preconditions

- Packet A may be done before this if it changes shared deposit-config contracts; otherwise re-read current contract and create a separate epoch.
- Base from then-current `main`, never old #69.

## Goal

Expose only a persisted, actually configured KRW bank account to an authenticated user and fail closed otherwise.

## Required contract

- authenticated user route,
- `requirePersisted()` semantics or current equivalent,
- explicit response allowlist only:
  - `configVersion`
  - `bankName`
  - `accountNumber`
  - `accountHolder`
  - `noticeKo`
  - `updatedAt`,
- blank/default/not-persisted account = NOT READY,
- no USDT/admin/security/ref fields,
- no account data from browser-local constants.

## Consumer UX

- loading / ready / not-ready / unauthorized / denied / unavailable states,
- account copy action with accessible label,
- explicit "입금하지 마세요" copy when account is not ready,
- KRW request button disabled until instructions are ready,
- request != credited balance remains visually and behaviorally true,
- no fake credit or balance increment.

## Required tests

- allowlist/static contract test,
- authenticated route test,
- persisted-ready fixture,
- absent/blank config fail-closed fixture,
- no-secret-response fixture,
- copy behavior,
- request-disabled-before-ready,
- request/pending-not-credited semantics,
- desktop + 390px browser/overflow/axe,
- Nest build + current gate + current Engine epoch process.

## Completion report

```text
KRW_INSTRUCTIONS_ALLOWLIST = PASS|FAIL
DAY1_DEFAULT_EXPOSED_AS_REAL = NO|YES
REQUEST_ENABLED_BEFORE_READY = NO|YES
REQUEST_EQUALS_CREDIT = NO|YES
MOBILE_390 = PASS|FAIL|NOT_RUN
ENGINE_EPOCH_STATUS = <actual>
PRODUCTION_MUTATION = 0
```

---

# PACKET C — Small Admin control-plane rebuilds (#49 concept)

## Strategy

Do not recreate #49 as one large PR. Split into bounded PRs. Suggested order:

1. server-verified Admin session/connection probe,
2. searchable user directory read model,
3. read-only withdrawal review visibility,
4. action-first dashboard counts,
5. adapter/source health presentation,
6. presentation-only beginner Admin polish.

Each backend/RBAC change gets its own protected-scope review and acceptance implications.

## Global truths

- AdminGuard/RBAC deny-by-default stays authoritative.
- Do not invent withdrawal approve/reject/broadcast transitions.
- Ledger/money state stays server authoritative.
- Read endpoints return minimum required fields only.
- "Connected" must require server-verifiable authenticated/RBAC truth, not client assumption.
- Unknown provider/runtime state remains unknown/unavailable, never cosmetically green.

## Required QA per bounded PR

- current route classifier/RBAC verifier,
- unauthorized/forbidden tests,
- field-minimization test,
- current Admin browser coverage,
- mobile layout where surface is user-facing to operators,
- current gate,
- current Engine process for protected backend/schema changes.

---

# PACKET D — Live listing → opportunity promotion redesign (#50 concept)

## Preconditions

- P0-C Money/FX contract is already on current main.
- Re-read current listing persistence, repricing, asset master, image guard, opportunity schema, FX snapshot and event contracts.

## Product intent to preserve

- honest persisted live listings can create a missing opportunity,
- INSERT-only promotion for missing opportunity,
- existing opportunity row is not overwritten by the promotion path,
- both comparison legs must resolve and be fresh,
- image/publication guard must pass,
- identity match must resolve to a real Asset Master row,
- one bad asset/listing fails closed without fabricating a market opportunity.

## Money/FX requirements

- USDT authoritative.
- Never alias `usd_krw` to `usdtKrw`.
- Never assume 1 USDT = 1 USD.
- Consume the current trusted/fresh FX snapshot/provenance API or internal service contract.
- KRW is approximation only and may be absent when trust/freshness fails.
- No Day-1 seed represented as current FX.
- No provider calls from browser/user fan-out.
- Preserve anomaly and per-leg freshness semantics.

## Persistence/event requirements

- transaction/idempotency behavior must be explicit,
- race on "missing opportunity" must not create duplicates,
- DB uniqueness/insert conflict behavior must be handled deliberately,
- emitted event must identify the actual persisted opportunity according to the **current** event contract; do not assume `assetId` is the opportunity id,
- promotion failure must remain observable without turning listing ingestion into a fake success for opportunity creation.

## Required tests

- stale buy leg → no promotion,
- stale sell leg → no promotion,
- missing image/pub guard → no promotion,
- unresolved identity → no promotion,
- missing trusted KRW → USDT opportunity truth remains; KRW approximation absent/fail-closed according to current schema,
- explicit test proving USD/KRW cannot be silently used as USDT/KRW,
- duplicate/race/idempotency fixture,
- existing opportunity never overwritten,
- event identity contract,
- current listing/reprice regression suites,
- P0-B eBay isolation regression,
- P0-C money/FX regression,
- current Engine acceptance process.

---

# PACKET E — Auth Figma metadata reconciliation (#30 concept)

## Preconditions

- #77 premium UI work has settled to a final reviewed head or accepted main.
- Re-read the connected live Figma file; do not trust old #30 node ids purely because they are preserved in Git history.

## Historical candidate identifiers to verify, not auto-approve

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

## Rules

- live Figma read first,
- if a node is missing/superseded, record that truth instead of recreating authority,
- candidate remains candidate unless actual Founder approval evidence exists,
- Code Connect `applied=0` stays 0 unless a separately authorized workflow changes it,
- do not alter Account Hub V2.1 locked authority by retroactive inference,
- metadata-only PR preferred; no production Auth visual replacement bundled into metadata reconciliation.

## Required verification

- registry schema verifier,
- no duplicate/superseded authority collision,
- exact live node IDs/names where accessible,
- candidate/approved/locked semantics preserved,
- runtime Auth routes unchanged unless a separate product PR exists.

---

# PACKET F — BrowserStack compatibility watch (#68)

PR #68 remains a provider-compatibility blocked source branch. Do not lower the repository Playwright version simply to turn the harness green.

When revisiting:

1. Check the official BrowserStack Playwright supported-version matrix fresh.
2. Compare it to the repository's then-current `@playwright/test` version.
3. If officially supported, rebase/recreate the harness on current main and run it.
4. If still unsupported, keep `BLOCKED_PROVIDER_COMPATIBILITY` unless a separately isolated compatible runner is reviewed and proven not to mutate the main test stack.
5. A missing run or provider incompatibility is never PASS.

---

# Final safety lock

None of these packets may be used to infer:

- `ACK_RECEIVED=1`,
- `REBASE_APPLIED=1`,
- `CERT_ISSUED=1`,
- P0-C merge authorization,
- production FX provider clearance,
- production deployment authorization,
- P0-D start.

Every future packet starts with a fresh read of current repository/CI/governance truth.
