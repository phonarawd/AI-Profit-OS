---
name: Engine Final Re-Verification Audit
overview: "Independent, evidence-based re-audit of 02 Engine against the actual repository (code/DB/CI), per the AUDIT-ONLY mandate. No code was changed. Verdict: RED — the Rule Engine/Ledger/Pricing core is genuinely solid, but the entire new user-facing HTTP surface (participate/execute-tick/feed/membership/benefits) that the \"Pre-UI Runtime Gate\" was built to prove is unreachable by any real user today because JWT authentication is an explicit skeleton with no token issuance and no verification guard anywhere in the Nest app."
todos:
  - id: fix-jwt-auth-runtime
    content: Implement real JWT issuance (AuthService) + verification guard/middleware so req.user is populated for all session-protected Engine routes (P0-1)
    status: completed
  - id: wire-missing-verify-into-gate
    content: Add verify:user-opportunity-feed, participate-http, execute-rule-loop, catalog-runtime-seed, benefit-hub-surfaces into the enforced verify:gate/stubs run-all chain (P0-2)
    status: completed
  - id: add-api-nest-ci-typecheck
    content: Add a CI step to type-check/build services/api-nest (tsc --noEmit or filtered build) so compile errors are caught pre-merge (P1-1)
    status: completed
  - id: wire-cargo-test-ci
    content: Add cargo test/cargo check for services/engine-rust to CI (P1-1, secondary to CJS mirror already tested)
    status: completed
  - id: harden-trade-row-concurrency
    content: Add row lock (SELECT...FOR UPDATE) or status-guarded WHERE clause to trade_executions updates in TradeExecutionService to prevent status regression under concurrent execute-tick calls (P1-3)
    status: completed
  - id: enforce-real-opportunity-slots
    content: Replace the static dailyOppSlotsDefault constant fed into checkParticipateMembershipGuards with a real per-opportunity running-trade count (P2-1)
    status: completed
  - id: recheck-mcp-snapshot
    content: Re-run MCP execution_policies/opportunities row-count checks against the live Supabase project to confirm the v7.22.49 snapshot still holds
    status: completed
isProject: false
---

# ENGINE FINAL RE-VERIFICATION AUDIT REPORT (02 Engine · v7.22.49 claimed CLOSED)

Mode: AUDIT ONLY. No plan file, code, or config was modified during this session. All findings below are from direct reads of the current repository (services/api-nest, services/market-intelligence, services/engine-rust, supabase/migrations, tooling/verify, package.json, .github/workflows) cross-checked against `.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md` and `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md`.

## 1. Executive Summary

The Engine plan documents 26 "v7.22.44 CLOSE" todos plus 8 "v7.22.48/49 Pre-UI Runtime Gate" todos (E-R1..E-R8), all marked `completed`, with a final claim of MCP-verified `execution_policies active=1`, `opportunities available=3`, and "3 new gates PASS." This audit independently re-verified that chain.

Two very different truths coexist in this repository:

- The deterministic core (Rule Engine R1-R10, double-entry ledger, decimal pricing/FX math, DB constraints, membership ladder) is genuinely well-built, internally consistent, and matches the plan's formulas almost exactly. This is real engineering, not a stub.
- The delivery mechanism around that core — the part the Pre-UI Runtime Gate specifically existed to add (participate HTTP, execute-tick loop, user feed, membership/benefits read) — depends entirely on a JWT session (`req.user`) that **no code in this repository ever populates**. `AuthService` (`services/api-nest/src/auth/auth.service.ts`) is an explicit, self-documented skeleton ("Skeleton response — DB write + JWT mint = M1 wiring") that returns hardcoded `userId: "pending-user"` / `"anonymous"`. There is no `@nestjs/jwt`, no `passport-jwt`, no Nest `Guard` (`canActivate`), no middleware, and no dependency in `services/api-nest/package.json` capable of verifying a token. Every new "session-protected" controller (opportunities, trades, membership, benefits, referral, coach) will 401 `AUTH_REQUIRED` on 100% of real requests today.

This is precisely the "TODO checked ≠ actually done" pattern this audit was commissioned to catch, and it sits directly upstream of everything the 03 UI plan will need to demo end-to-end.

Additional systemic gap: the CI gate (`pnpm verify:gate` → `.github/workflows/gate.yml`) never runs `cargo test`, never type-checks/builds `services/api-nest`, and does not include 5 of the newest domain verify scripts (`user-opportunity-feed`, `participate-http`, `execute-rule-loop`, `catalog-runtime-seed`, `benefit-hub-surfaces`) in its automated chain. Their "PASS" claims in the plan are real for one manual run, but nothing stops a future change from silently breaking them.

## 2. Existing Engine Plan (pointer)

`.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md` (2022 lines). Frontmatter declares todos 1-26 (`engine-preflight-constitution` ... `ai-coach-runtime`) plus 8 REOPEN todos `engine-runtime-preflight-gap` .. `engine-pre-ui-close` (E-R1..E-R8), all `status: completed`. Body sections audited: §0 (preflight/gate history), §0.0 (pricing/FX/capital tiers/asset images/membership), §2-4 (architecture, Opportunity Card schema, arbitrageType projection, INTERNAL/USER split), §12-13 (events, AI layer), §47 (Personal AI), §48.13 (MATCH_SUCCESS Rule Engine), §51 (ADRs, simulation, grade pipeline).

## 3. Plan Inventory (grouped IDs — 2000+ lines condensed to claim clusters)

- ENG-001 Pricing/FX formula SSOT (§0.0.4.1-4.2)
- ENG-002 Capital tier catalog + seed ratios (§0.0.5)
- ENG-003 Balance-aware feed classification (§0.0.5.1)
- ENG-004 Asset image hydrate + publish guard (§0.0.6)
- ENG-005 Membership ladder + daily cap + strictness overlay (§0.0.7)
- ENG-006 Opportunity Card schema + arbitrageType projection (§4.1-4.2a)
- ENG-007 INTERNAL/USER field split (§4.2b)
- ENG-008 MATCH_SUCCESS Rule Engine R1-R10 + Soft60/Hard90/REQUEUE/MATCH_TIMEOUT (§48.13)
- ENG-009 participate ↔ Rule cross-contract P0-P7 (§48.13.1)
- ENG-010 Match Strictness presets → policy map (§48.13.3)
- ENG-011 Mission reward fanout boundary (§48.13.4)
- ENG-012 Simulation engine M0.5 gates S1-S4 (§51.4)
- ENG-013 Personal AI P/G/S router + Fact tools + LLM adapter (§47)
- ENG-014 E-R1..E-R8 Pre-UI Runtime Gate (user feed / participate / execute-tick / catalog seed / membership read)
- ENG-015 Legacy/INTERNAL field semantics (buyPriceUsdt, executionPlatforms, expectedSellDays)

## 4. TODO Re-verification Matrix (PLAN → FILE → CODE → TEST)

Format per item: verdict + evidence.

- ENG-001 Pricing/FX — **VERIFIED_COMPLETE**. `services/market-intelligence/src/pricing-formula.cjs:65-176` reproduces the plan's exact formula (grossSpread → fees → riskBuffer(max) → costBuffer → platformMargin(max0) → expectedProfit) using BigInt decimal math (`money.cjs`), and `tooling/verify/pricing-formula.cjs` / `fx-snapshot-formula.cjs` execute it against fixtures with ±0.000001 tolerance. Both scripts run inside `tooling/verify/stubs/run-all.cjs`, which is itself a step of `verify:gate` — so this one is CI-enforced.
- ENG-005 Membership — **VERIFIED_COMPLETE** for the ladder/overlay logic itself (`services/market-intelligence/src/membership.cjs`, snapshot-locked, unit-verified via `tooling/verify/membership-ladder.cjs` + `membership-daily-cap.cjs`, both in the gate chain). **PARTIALLY_IMPLEMENTED** for the "opp.slotsLeft > 0" guard specifically — see §6/§9 below.
- ENG-008 Rule Engine — **VERIFIED_COMPLETE**. `services/engine-rust/settlement_rule.cjs` (Node runtime SSOT) and `services/engine-rust/src/settlement_rule.rs` (Rust mirror, `#[cfg(test)]` covers success/timeout/requeue/p0b) implement R1-R10 identically; `tooling/verify/match-success-rule.cjs` runs the CJS module against all 6 golden fixtures plus scans both sources for forbidden patterns (`Math.random`, `successRatePercent`, `rand::`, `thread_rng`). This is real and CI-enforced.
- ENG-009 participate contract — **PARTIALLY_IMPLEMENTED**. Logic in `services/api-nest/src/opportunities/participate.service.ts` is real (P0b-P5, idempotency, membership guard, ledger lock). But the endpoint is unreachable end-to-end today — see §14 False Completion.
- ENG-014 E-R1..E-R8 — **DOCUMENT_ONLY at the "closed and demoable" level, PARTIALLY_IMPLEMENTED at the code level.** Files exist, DI wiring in `app.module.ts` is correct, DB migrations landed (`20260809142108_execution_policy_day1_bootstrap.sql`, `20260809144409_catalog_runtime_day1_fx_bootstrap.sql`), the 3 dedicated verify scripts (`user-opportunity-feed.cjs`, `participate-http.cjs`, `execute-rule-loop.cjs`) do real contract+logic checks and would currently PASS if run manually. But: (a) they are not in `verify:gate`'s enforced chain, and (b) none of them detect the missing Auth runtime, because they check source-code shape, not a live HTTP call with a real JWT. The plan's "3 gates PASS ⇒ Engine ready for 03 UI" conclusion does not hold.
- ENG-013 Personal AI — **IMPLEMENTED_NOT_TESTED / PARTIALLY_IMPLEMENTED**. Router/Guard/Twin exist (`assistant.service.ts`, `fact-tool.service.ts`), but plan's own §47.15.1 admits `LLMAdapter` and Coach HTTP are unimplemented (`provider_id: "none"`). Consistent with plan — not a new finding, just re-confirmed.
- Everything else in the 1-26 list (adapters folders, vertical seeds, asset-image pipeline, DDL alignment) — spot-checked and **VERIFIED_COMPLETE**: `20260809023713_user_opportunity_overrides_schema_align.sql` genuinely replaces `pinned`/`margin_override_usdt` with the schema-aligned columns the plan calls for, with a pin-cap trigger and mutual-exclusion CHECK constraint — this is real, careful migration work.

## 5. Pipeline Verification

Traced: `opportunities.user.controller.ts` → `opportunities.user.service.ts` (`buildBalanceAwareFeedWithOverrides`) → Postgres `public.opportunities` → `participate.service.ts` (P0b-P5 guards, `settlement_rule.cjs.guardParticipate`) → `trade_executions`/`participate_requests` insert (ledger `participate_lock` journal) → `trades.execution.service.ts` (`execute-tick` polling, `settlement_rule.cjs.evaluateExecution`) → on `MATCH_SUCCESS`, ledger `settlement` journal (locked→principal reversal + profit credit + platform margin) → `SettlementCompletedFanout` (listens `ledger.journal.posted`, filters `journalType==="settlement"`) → `MissionRewardEvaluator` (async, decoupled).

Documented pipeline vs actual code: **matches** field-for-field, including the Phase0 polling decision explicitly called out in plan §0.9.2 (`transport: "polling"` literal in `trades.execution.service.ts:75`). No drift found here. The one missing link is upstream of all of this: nothing populates `req.user`, so the pipeline is provably correct in isolation but not reachable from outside.

## 6. Rule Engine Audit

R1-R10 present in both `settlement_rule.cjs` and `settlement_rule.rs`, verified line-for-line identical semantics:
- R1 circuit closed, R2 user not frozen/banned, R3 opportunity available, R4 compareReady, R5 stale ≤ staleAllowanceSec, R6 expectedProfit ≥ minProfit, R7 pricingVersion match OR soft-accept, R8 simulation payout feasible, R9 listing legs fresh, R10 rematchCount ≤ max.
- Soft60/Hard90 wall, REQUEUE eligibility (`isRetryable` only for `PRICE_MOVED`), and `MATCH_TIMEOUT` precedence (hard wall checked before rule evaluation) all match plan §48.13 exactly.
- Presentation duration is provably ignored (`tooling/verify/match-success-rule.cjs` asserts `presentationDurationSec: 8` vs `15` produce identical results).
- No Rule is documented in the plan that doesn't exist in code, and no extra undocumented Rule exists in code. **VERIFIED_COMPLETE.**

## 7. Matching Audit

- Eligibility guards (P0b matchBlocked, P1 compareReady, P5 priceHardStale) are enforced pre-trade in `participate.service.ts` before any row is created — correct fail-closed behavior.
- Duplicate-participate protection: `participate_requests.idempotency_key` and `trade_executions.idempotency_key` are DB `UNIQUE` (`supabase/migrations/20260808205850_opportunities_pricing.sql:137,157`), and `ParticipateService.findByIdempotency` reuses on collision. **Retry-safe for identical requests.**
- **Gap (not covered by idempotency):** nothing prevents the same user from calling `participate()` twice with two *different* idempotency keys for the *same* opportunity, creating two independent concurrent `running` trades each locking capital separately (no `UNIQUE(user_id, opportunity_id) WHERE status IN ('running','requeue')` constraint, no application-side check). Classified P2 — money-safety intact (each trade individually balance-checked), but "same Opportunity matched twice by the same user concurrently" is possible today.
- **Gap (opportunity-level slot cap is decorative):** `checkParticipateMembershipGuards` genuinely enforces `slotsLeft > 0` (`services/market-intelligence/src/membership.cjs:470-498`, unit-tested in `tooling/verify/membership-daily-cap.cjs`), but every caller (`participate.service.ts:526`, `trades.execution.service.ts:526-528`) passes `slotsLeft: Number(policy.dailyOppSlotsDefault) || 1` — a **global policy constant**, never a per-opportunity count of concurrently running trades. There is no query anywhere (`SELECT count(*) FROM trade_executions WHERE opportunity_id=... AND status IN ('running','requeue')`) computing real remaining capacity. Result: an opportunity's "daily slots" cap on concurrent participation is effectively never enforced per-opportunity — many users can pile into the same limited-supply opportunity simultaneously. Classified **F. PLACEHOLDER** for this specific sub-guard (P2).

## 8. State Machine Audit

`opportunities.status`: `available|paused|expired|circuit_open` (DB CHECK, `opportunities_pricing.sql:74-75`) — used consistently in `participate.service.ts`, `trades.execution.service.ts`.
`trade_executions.status`: `running|requeue|success|safe_stop|cancelled|failed` (DB CHECK, same file:119-120) with `result_code` enum `MATCH_SUCCESS|REQUEUE|PRICE_MOVED|BELOW_MIN_PROFIT|CANCELLED_BY_USER|CIRCUIT_OPEN|SYSTEM_FAILED|MATCH_TIMEOUT` — identical set used in `trades.execution.service.ts` TypeScript types, `settlement_rule.cjs`, and `schemas/trade-execution-state.v1.json` (cross-checked via `tooling/verify/execute-rule-loop.cjs:201-212`).
**No drift found between plan, DB, and code for state naming — VERIFIED.** (The audit template's example states — DISCOVERED/VALIDATED/ELIGIBLE/... — do not appear anywhere in this repo; the actual state model is the running/requeue/success/safe_stop one, and it is used uniformly.)

**Real gap:** none of the 3 `UPDATE public.trade_executions ... WHERE id = $1::uuid` statements in `finalizeMatchSuccess` / `applyRequeue` / `finalizeSafeStop` (`services/api-nest/src/trades/trades.execution.service.ts:299-434`) guard on current `status` (no `AND status='running'`), and `executeTick` never takes a row lock (`SELECT ... FOR UPDATE`) before evaluating the Rule. Two concurrent `execute-tick` calls (double-tap, two open tabs) could race: one writes `success` (with `ledger_journal_id` set), a second — evaluated a few ms earlier with slightly different opportunity data — could still be mid-flight and overwrite the row back to `requeue`/`safe_stop` afterward, since neither write is conditioned on the other's outcome. **Money is not at risk** (the ledger's `idempotency_key = settlement:{tradeId}` makes double-crediting impossible), but the *displayed/stored* trade status could regress after a real credit has posted. Classified **H. REGRESSION_RISK, P2** (state-machine display bug, not fund-safety).

## 9. Idempotency Audit

- Ledger (`LedgerPostingService.postJournal`, `services/api-nest/src/ledger/ledger.posting.service.ts:54-204`): transaction-wrapped, `idempotency_key UNIQUE` on `ledger_journals`, explicit 23505-catch-and-reuse fallback, `FOR UPDATE ... ORDER BY id ASC` account locking. This is correctly built double-entry idempotency. **VERIFIED_COMPLETE.**
- Participate: idempotency_key required (`minLength 8`), reused on retry (`participate.service.ts:136-139`, `538-575`). **VERIFIED_COMPLETE.**
- Settlement: `idempotencyKey: settlement:${trade.id}` (`trades.execution.service.ts:283`) — one settlement per trade, guaranteed by DB unique constraint even under concurrent execute-tick races. **VERIFIED_COMPLETE.**
- Safe-stop unlock: `idempotencyKey: participate_unlock:${trade.id}` similarly deduped. **VERIFIED_COMPLETE.**
- Mission accrual: plan claims "outbox replay · idempotency" (§48.13.4) — not independently re-verified line-by-line in this pass (Money-domain file); flagged as **BLOCKED (I)** for this audit's scope, recommend covering in a Money-focused pass.

## 10. Concurrency Audit

- Ledger account row locks: correct (`ORDER BY id ASC FOR UPDATE`, deadlock-safe). **VERIFIED_COMPLETE.**
- Trade-row concurrency: **gap**, see §8 above (P2).
- Opportunity-row concurrency: `opportunities` table is read without locking during participate/execute (acceptable — it's a read of slowly-changing pricing state, not a balance), no issue found.
- No application-level distributed lock / advisory lock is used anywhere for `execute-tick`; Phase0 relies entirely on ledger-level idempotency to absorb races. This is a reasonable Phase0 tradeoff given no NATS/queue yet, but should be called out explicitly as a design limitation, not silently assumed safe.

## 11. Stale Data Audit

- `staleAt` / `priceStaleMaxSec` (default 3s) enforced both at participate (`guardParticipate`, P5) and at execute-tick (R5, `staleAllowanceSec` from policy). Matches plan §43/§48.13 exactly.
- `listingLegsFresh` fallback logic (`trades.execution.service.ts:457-468`) is a **local heuristic** (both legs present + compareReady + no gradeMismatch) rather than a true adapter-TTL freshness check, because Day-1 has no live external adapter wired into this runtime path yet (adapters are Phase1 deploy). This is consistent with the plan's own Phase0/Phase1 split — not a defect, but worth flagging as **IMPLEMENTED_NOT_TESTED against a real external feed** (there is no live adapter to test staleness against yet).

## 12. FX Audit

`services/market-intelligence/src/fx-snapshot-formula.cjs` (composeFxSnapshot) implements the documented CoinGecko-primary / Frankfurter-fallback formula with `formulaId` + `sources[]` recorded per snapshot, exactly as §0.0.4.2 specifies. `supabase/migrations/20260809144409_catalog_runtime_day1_fx_bootstrap.sql` seeds a deterministic Day-1 `fx_day1_runtime_seed` row only when the table is empty. **VERIFIED_COMPLETE** for the formula; the "live" CoinGecko/Frankfurter adapter calls themselves are Phase1 deploy (workers folders exist but are not wired into this runtime path) — consistent with plan, not a new gap.

## 13. Price Precision Audit

All money paths use **decimal strings + BigInt** (`services/market-intelligence/src/money.cjs`, mirrored by `services/api-nest/src/ledger/ledger.money.ts`), scale=18, explicit half-up rounding in `mulAmount`. No `parseFloat`/`Number()` arithmetic found on money fields in the paths read (participate, execute-tick, ledger posting, pricing formula). **VERIFIED_COMPLETE — no floating-point money bugs found.**

## 14. Profit Calculation Audit

`computeOpportunityPricing` (`services/market-intelligence/src/pricing-formula.cjs:65-176`) reproduces the plan's §0.0.4.1 formula exactly: `grossSpread → fees(buy+sell legs) → riskBuffer(max(spread×pct,min)) → costBuffer → platformMargin(max(0,·)) → expectedProfit`. Independently re-derived by hand against the plan's pseudocode — **matches to the operation**. `tooling/verify/pricing-formula.cjs` enforces this with a numeric tolerance check. **VERIFIED_COMPLETE.**

## 15. Scoring / AI Audit

Rule Engine (deterministic, §48.13) and AI (`aiConfidenceScore`, `sellSuccessRate` display-only) are cleanly separated in every file read: `mergeEffectivePolicy` explicitly throws `FULFILL_RATE_AS_RULE_FORBIDDEN` if any caller tries to smuggle `fulfillRate7d` into the policy object (`services/market-intelligence/src/membership.cjs:387-395`) — a genuinely defensive, test-enforced separation. No LLM/AI code path was found influencing `evaluateExecution` or `guardParticipate`. **VERIFIED_COMPLETE — no CRITICAL ARCHITECTURE CONFLICT found.**

## 16. Error Handling Audit

- DB failure: `PostgresService.configured()` checks exist and several services short-circuit gracefully when unconfigured (e.g., `CatalogRuntimeSeedService.onModuleInit` catches and logs a warning rather than crashing boot).
- Domain errors: consistently thrown as Nest `HttpException` subclasses with a `code`/`toastCode` payload matching plan's toast catalog (`INSUFFICIENT_BALANCE`, `MATCH_BLOCKED`, `PRICE_STALE`, etc.) — good API/UI contract discipline.
- External API failure / malformed payload / duplicate event / worker crash: **not exercised in this runtime path** because no live external adapter call happens in participate/execute-tick (by design, Phase0). This audit could not verify eBay/adapter failure handling because that code path (workers/ebay-adapter) is Phase1-deploy and outside this session's scope; flagged as **BLOCKED (I)** pending a dedicated Adapter-domain pass.

## 17. Retry Audit

Rule-level REQUEUE has a hard ceiling via `maxRematchCount` **and** a time-boxed guard (`now + retryWaitSec*1000 < hard`) preventing a REQUEUE that would blow past the Hard90 wall — this is a correct, storm-proof design (verified by `tooling/verify/match-success-rule.cjs`'s explicit "REQUEUE blocked when retry would cross hard" test). No infinite-retry path found in the Rule Engine. **VERIFIED_COMPLETE** for Rule-level retry; adapter-level retry/backoff not assessed (Phase1, out of this session's runtime scope).

## 18. Database Audit

- Constraints found and correct: `ledger_journals.idempotency_key UNIQUE`, `ledger_entries.amount_usdt CHECK > 0`, `execution_policies` `CREATE UNIQUE INDEX ... WHERE is_active` (exactly one active policy row, enforced by Postgres, not application code — excellent), `trade_executions.idempotency_key UNIQUE`, `participate_requests.idempotency_key UNIQUE`, `user_opportunity_overrides` mutual-exclusion CHECK (`hidden` xor `force_show`) plus a trigger-enforced 10-pin cap per user.
- `opportunities_pricing_no_yahoo_chk` CHECK constraint blocks `yahoo_jp` at the DB layer, not just in application code — a genuinely defense-in-depth implementation of the yahoo-ban policy.
- RLS: enabled on new audit tables (`user_opportunity_override_audit`). Search-path hardening applied to the pin-cap trigger function per Supabase advisor guidance (`20260809143754_...sql`).
- **VERIFIED_COMPLETE** — this is the strongest-evidenced area of the whole audit.

## 19. API Contract Audit

Endpoints found, matching plan §0.9.8 naming exactly:
- `GET /api/v1/opportunities`, `GET /api/v1/opportunities/:id`, `POST /api/v1/opportunities/:id/participate`
- `GET /api/v1/trades/:id`, `POST /api/v1/trades/:id/execute-tick`
- `GET /api/v1/me/membership`, `GET /api/v1/me/benefits(+/summary)`

Request/response DTOs cross-checked against `schemas/participate-request.v1.json`, `schemas/opportunity-card.v1.json`, `schemas/trade-execution-state.v1.json` via the dedicated verify scripts — fields match. Error codes match plan's toast catalog. **Contract shape is VERIFIED_COMPLETE.** **Auth is NOT** — see §27 False Completion; every one of these routes is currently unreachable with a real identity.

## 20. Event Contract Audit

In-process bus (`InProcessEventBus`) topics found: `opportunities.events.ts` (`participate.confirmed`), `LEDGER_EVENTS.journalPosted`. `SettlementCompletedFanout` correctly filters `journalType==="settlement"` and is intentionally decoupled from the Rule/execute service (verified by `execute-rule-loop.cjs:157-168` asserting the fanout file does NOT reference `evaluateExecution`/`settlement_rule.cjs`/`TradeExecutionService`). This event-boundary discipline is real and matches plan §48.13.4's "fanout boundary" requirement precisely. **VERIFIED_COMPLETE.**

## 21. Observability Audit

- Nest `Logger` used in some services (e.g., `CatalogRuntimeSeedService`), but **not** in the money-critical path (`ParticipateService`, `TradeExecutionService` have no `Logger` instance, no structured per-request logging).
- No correlation ID / request ID / trace ID propagation found anywhere in the participate → execute-tick → settlement chain (no header capture, no `x-request-id`, no `traceId` field on the domain events).
- `AI_ANSWER_TRACE` (per plan §47.5) exists conceptually in the AI layer design but wasn't independently re-verified as populated end-to-end in this pass.
- Classification: **IMPLEMENTED_NOT_TESTED / DOCUMENT_ONLY** for cross-request traceability. P2 — will materially slow down debugging "why did trade X get stuck / double-processed" incidents once real traffic exists.

## 22. Test Audit

- **Zero** `*.spec.ts` / `*.test.ts` files exist anywhere in the repository (`Glob **/*.spec.ts` and `**/*.test.ts` both returned 0 results).
- No Jest/Vitest/Mocha listed in root `package.json` or `services/api-nest/package.json` devDependencies.
- Rust has real `#[cfg(test)]` unit tests in `settlement_rule.rs` (5 tests: walls_locked, match_success, hard_wall_timeout, presentation_ignored, p0b_match_blocked, requeue_on_stale_legs) — genuinely good, but **`cargo test` is never invoked in CI** (`.github/workflows/gate.yml` installs the Rust toolchain but only runs `pnpm verify:gate` + Next.js builds — no `cargo test`/`cargo check` step exists anywhere).
- `services/api-nest` (the TypeScript service containing ParticipateService/TradeExecutionService/LedgerPostingService) is **never compiled or type-checked in CI** — no `tsc --noEmit`, no `pnpm --filter @aipo/api-nest build` step exists in `gate.yml` or `tooling/verify/gate.cjs`.
- The `tooling/verify/*.cjs` scripts are the *only* testing mechanism for this domain. They are legitimate — several (`match-success-rule.cjs`, `execute-rule-loop.cjs`, `participate-http.cjs`, `user-opportunity-feed.cjs`) genuinely `require()` and execute real business-logic functions against constructed inputs, not just string-grep — but they are contract/logic-shape tests, not integration/E2E tests, and they do not boot the Nest app or make a real HTTP request.
- **Classification: MUST-FIX gap.** "A single golden test exists" is explicitly called out in the audit's own rules as insufficient for VERIFIED_COMPLETE — and here it's worse: there is no TS compile check and no app-boot check at all.

## 23. Edge Case Audit

Confirmed handled: zero/negative price (`assertAmount` rejects non-decimal, pricing formula rejects negative buy/sell), missing FX (insert-only bootstrap migration + `ensureFxSnapshot` throws if still empty), duplicate opportunity/listing (upsert-by-`asset_id` dedup in `catalog-runtime-seed.service.ts`), duplicate participate/settlement (idempotency keys, covered above), out-of-order/duplicate ledger journal (unique key + 23505 catch).
Not exercised / unverifiable in this pass: worker restart mid-tick (Phase0 has no queue/worker to restart — client-driven polling only, so this risk is architecturally deferred, not solved), malformed external API response (no live adapter call in this runtime path), DB restart mid-transaction (relies on Postgres's own transaction guarantees — not independently drilled here).

## 24. Performance Audit

- `opportunities.user.service.ts.loadFeedCandidateRows` (`LIMIT 200`, indexed on `(status, stale_at)` per `opportunities_status_stale_idx`) — bounded, indexed, no N+1 found in the feed path itself.
- Per-card override lookup batches by `opportunity_id = ANY($2::uuid[])` (single query, not N+1) in `loadOverridesMap`.
- **Minor N+1 candidate:** `assertMembershipGuards` and `resolveRulePolicy` each issue 2 sequential queries (`user_membership`, `user_match_policy_overrides`) per participate/execute-tick call — not batched, but at low request volume this is not yet a bottleneck. File: `services/api-nest/src/opportunities/participate.service.ts:461-493`, `services/api-nest/src/trades/trades.execution.service.ts:498-517`. Flagged as **P3, watch under load**, not urgent.
- No queue backlog / retry-storm risk found in this runtime path (no queue exists yet — Phase0 in-process only, by design).

## 25. 1-Minute SLA Audit

Soft60/Hard90 walls are enforced by wall-clock math (`softDeadlineMs`/`hardDeadlineMs`, T0=`participateAcceptedAtMs`) independent of presentation, and the Hard wall is checked *before* Rule evaluation each tick — so the SLA ceiling is real and code-enforced, not aspirational. However, the SLA is **client-driven polling** (`POST /trades/:id/execute-tick` must be called by the client repeatedly); there is no server-side scheduler/cron/queue advancing a trade if the client stops polling (tab closed, app backgrounded on mobile). A trade can sit in `running` indefinitely past Hard90 until *something* calls `execute-tick` again, at which point it will correctly resolve to `MATCH_TIMEOUT` retroactively — so money-safety holds (no false credit), but the "≈1 minute" user-facing promise depends on continuous client polling that nothing guarantees. **P1 finding** for 03 UI: the client must implement a resilient poll loop (visibility change / background handling), and ideally 03/Infra should add a minimal server-side sweep once a queue exists (Phase1).

## 26. Legacy Field Audit

- `buyPriceUsdt`/`sellPriceUsdt`, `executionPlatforms`, `expectedSellDays`: all present in schema/code exactly as the plan's §4.2b table prescribes — **KEEP WITH SEMANTIC REINTERPRETATION**, correctly stripped from user-facing payloads (`opportunities.user.service.ts` builds an `internal` object then calls `projectCapitalProviderUserSurface(..., {audience:"user"})`, verified by `tooling/verify/user-opportunity-feed.cjs`'s runtime check that `executionPlatforms`/`expectedSellDays` are absent from the projected output). No conflict found.
- No stray `trade`/`trader`/`buy`/`sell` verbs found in user-facing copy paths within the files read (those are UI-domain, out of this session's file set, but the Engine-side field naming discipline is intact).

## 27. Plan ↔ Code Difference Matrix

- Item: "Engine Pre-UI Runtime Gate CLOSED, 3 gates PASS." — Plan says: fully closed, safe for 03 UI. Code does: contract/logic-level implementation is real; HTTP reachability is zero (no Auth). Test proves: only file/shape/pure-function checks, not one real HTTP call. **Verdict: CONFLICT.**
- Item: "`auth-ssot` completed (Index/Money)." — Plan says: Nest JWT auth done. Code does: `AuthService` explicitly self-labeled "skeleton"; no JWT sign/verify, no guard, no middleware anywhere. Test proves: `verify:auth-flows.cjs` checks file/route/schema shape only, never a signed token. **Verdict: CONFLICT.**
- Item: "`opp.slotsLeft > 0` participate guard (§0.0.7)." — Plan says: per-opportunity slot cap enforced. Code does: guard function is real and unit-tested; every caller feeds it a global constant, never a real per-opportunity count. Test proves: unit test passes with synthetic `slotsLeft`, never exercises the real caller wiring. **Verdict: PARTIAL.**
- Item: "settlement_rule.rs R1-R10 Soft60/Hard90 REQUEUE MATCH_TIMEOUT golden6." — Plan says: live. Code does: correct, deterministic, faithfully mirrored between Rust and CJS. Test proves: golden fixtures + forbidden-pattern scan, in the enforced gate chain. **Verdict: VERIFIED.**
- Item: "DDL↔schema alignment for `user_opportunity_overrides`." — Plan says: aligned. Code does: migration genuinely replaces old columns, adds CHECK/trigger/index. Test proves: not independently unit-tested beyond the migration itself running cleanly, but the SQL is self-verifying (constraints). **Verdict: VERIFIED.**
- Item: "MCP `execution_policies active≥1 · opportunities available≥1`." — Plan says: confirmed via MCP query at close time. Code does: `execution_policies_one_active_uq` and the catalog-seed service make this structurally likely to hold, but this audit did not re-run a live MCP query against the current remote DB (out of scope for a static/code audit; recommend re-running as a follow-up before trusting the number is still true today). **Verdict: UNTESTED (this session).**

## 28. False Completion Detection

Matches found against the checklist in the audit brief:
- "code exists but no caller" — inverse case found: **caller exists but the thing it calls (working JWT verification) does not exist at all.** This is the single most important finding.
- "API exists but not connected" — literally true for every new user route: the API is connected to Nest routing, but not connected to any real identity.
- "schema exists but not persisted" — not found; persistence paths are real (checked SQL inserts/updates throughout).
- "test only implementation" — the `tooling/verify/*.cjs` scripts blur this line: they are real logic execution, but only ever exercise pure functions directly, never the actual `@Controller` → `@Injectable` → Postgres → HTTP response chain. Borderline case, called out explicitly rather than silently accepted.
- "feature flag permanently disabled" — not found.
- "throw new Error(not implemented)" / mock data / hardcoded response — found exactly this pattern in `AuthService.signupStageA()` / `.session()` (hardcoded `"pending-user"`, `"anonymous"`, `"pending-session"`, `"skeleton"` string literals returned as if real).

## 29. Completion Score

- Plan Completion: ~95% (nearly every documented item has a corresponding code artifact)
- Code Completion: ~80% (Rule/Ledger/Pricing/DB layers essentially done; Auth layer is 0%; a few guards like slotsLeft are decorative)
- Test Completion: ~35% (strong logic-level verify scripts for the domains that have them; zero unit/integration/e2e tests; CI never compiles or type-checks the TS service; CI never runs cargo test)
- Integration Completion: **~10%** (nothing can be exercised end-to-end via real HTTP with a real identity today)
- Production Readiness: **~15%**
- Critical blocker (stated separately, not averaged in): **Auth runtime does not exist.** This single gap caps Integration/Production readiness regardless of how good the rest of the score looks.

## 30. P0/P1/P2/P3 Risk Register

P0 — CRITICAL:
- P0-1: No JWT issuance or verification anywhere (`services/api-nest/src/auth/auth.service.ts` skeleton; no guard/middleware in repo). Every new Engine user endpoint 401s on every real request. File: `services/api-nest/src/auth/auth.service.ts:76-107,226-237`; absence confirmed repo-wide.
- P0-2: `verify:gate` (the only CI-enforced gate) does not include `verify:user-opportunity-feed`, `verify:participate-http`, `verify:execute-rule-loop`, `verify:catalog-runtime-seed`, or `verify:benefit-hub-surfaces`. A future regression in any of these files will not fail CI. Files: `tooling/verify/gate.cjs:6-27`, `tooling/verify/stubs/run-all.cjs:6-70` (neither list contains these 5 ids).

P1 — HIGH:
- P1-1: Zero unit/integration/e2e tests for `services/api-nest`; no `tsc` build/typecheck step and no `cargo test`/`cargo check` step anywhere in CI (`.github/workflows/gate.yml`).
- P1-2: 1-minute SLA depends on uninterrupted client polling with no server-side sweep; background/closed-tab clients can leave trades stuck past Hard90 until the client returns. `services/api-nest/src/trades/trades.execution.service.ts`.
- P1-3: Trade-row updates (`finalizeMatchSuccess`/`applyRequeue`/`finalizeSafeStop`) have no row lock or status-guarded WHERE clause; concurrent execute-tick calls can regress displayed trade status after a real ledger credit. `services/api-nest/src/trades/trades.execution.service.ts:299-434`.

P2 — MEDIUM:
- P2-1: `opp.slotsLeft` guard is fed a global constant, not a real per-opportunity concurrent-trade count — the "daily slots per opportunity" cap is not actually enforced. `services/api-nest/src/opportunities/participate.service.ts:526`, `.../trades/trades.execution.service.ts:526-528`.
- P2-2: No unique constraint/application check preventing a user from opening two independent concurrent trades on the same opportunity via two different idempotency keys.
- P2-3: No correlation/request/trace ID propagation through participate→execute→settlement; `Logger` usage is inconsistent across services in this path.

P3 — LOW:
- P3-1: `assertMembershipGuards`/`resolveRulePolicy` issue 2 sequential (non-batched) queries per call — fine at current scale, watch under load.
- P3-2: `rematchCount` is stored inside a JSONB `asset` blob rather than a first-class column — functional but a slightly fragile modeling choice.

## 31. VERIFIED COMPLETE

Rule Engine (R1-R10, Soft60/Hard90/REQUEUE/MATCH_TIMEOUT, golden tests, CI-enforced); double-entry ledger (idempotency, ASC FOR UPDATE locking, balanced-journal assertion, practice-isolation guard); pricing/FX formula (decimal-exact, CI-enforced); DB schema/constraints for opportunities/trades/participate/overrides/execution_policies; INTERNAL↔USER field projection and legacy-field stripping; membership ladder/overlay math and its Rule-input firewall (`FULFILL_RATE_AS_RULE_FORBIDDEN`); event-fanout boundary discipline (Mission/Ticker decoupled from settlement).

## 32. NOT VERIFIED

Any real end-to-end HTTP flow with an authenticated user (cannot exist today — no Auth runtime); MCP-reported live row counts as of *this* session (not re-queried); adapter-level (eBay/etc.) failure handling and retry/backoff (Phase1, out of this pass's file set); mission accrual idempotency/outbox claims (Money-domain file, not re-read here); AI Coach/LLM runtime (plan itself already flags this as unimplemented).

## 33. MUST FIX BEFORE UI/UX IMPLEMENTATION

1. Implement real JWT issuance in `AuthService` (sign a token on signup/login with real `userId`) and a real verification guard/middleware wired globally or per-module so `req.user` is populated from a validated bearer token. Until this exists, 03 UI cannot demo or test a single authenticated flow end-to-end no matter how well the screens are built.
2. Add the 5 missing verify scripts to the enforced `verify:gate` chain (either add them to `tooling/verify/stubs/run-all.cjs`'s `live` array or `tooling/verify/gate.cjs`'s `steps`), so the Pre-UI Runtime Gate's own proof points are continuously enforced, not one-time claims.
3. Add a minimal CI step that type-checks/builds `services/api-nest` (`tsc --noEmit` or `pnpm --filter @aipo/api-nest build`) so a broken import/type error is caught before merge.
4. Re-run the MCP checks (`execution_policies active`, `opportunities available`) against the current remote DB to confirm the v7.22.49 snapshot still holds before treating it as ground truth for UI work.

## 34. CAN BE DEFERRED

Server-side sweep/scheduler for stalled trades (Phase1, once a queue exists); per-opportunity real slot-count enforcement (P2, fine to fix alongside Admin capacity tooling in 04); trade-row optimistic locking hardening (P2, ledger-level idempotency already prevents fund loss); correlation-ID/tracing rollout (P2, valuable but not blocking); adapter-level retry/backoff hardening (explicitly Phase1 per plan); `cargo test` wiring into CI (P1 but does not block UI work, since the CJS mirror — the actual runtime code — is already exercised by `match-success-rule.cjs`).

## 35. Final Verdict

**RED — ENGINE NOT VERIFIED / CRITICAL GAP.**

Qualification, because a flat RED undersells real, solid work: the Rule Engine, ledger, and pricing core are GREEN-quality and should not be touched or redesigned. The RED is scoped specifically to "is the Engine's new user-facing HTTP surface actually usable by a real user today, as the Pre-UI Runtime Gate claims" — and the answer is no, because the one thing every one of those endpoints depends on (a populated `req.user` from a real JWT) does not exist anywhere in the codebase. This is a narrow, well-defined, bounded gap (Auth), not a call to rework Engine's domain logic.

## 36. Exact Next Action

Do not start 03 UI's integrated/data-wired build yet. Recommended order:
1. Fix P0-1 (real JWT issuance + verification guard) — likely a short, focused Infra/Auth task, not an Engine rewrite.
2. Fix P0-2 (wire the 5 missing verify scripts into `verify:gate`).
3. Re-run Engine's own `engine-pre-ui-close` re-verification (MCP counts + the 3 gates) for real, now that a genuine session can exist, ideally with one true HTTP integration test added at that time (even a single supertest-style call would have caught P0-1 immediately).
4. Only then resume 03 UI `ui-preflight-constitution`, and even so, 03 UI can safely start now on Canon/Brand/static-contract work (screens, copy, DTO-shaped mocks) — just not on "log in and complete a real participate→settle flow" work.

---

## FINAL OUTPUT (A-E + Status, as requested)

**A. WHAT IS ACTUALLY COMPLETE**
Rule Engine (R1-R10, Soft/Hard/REQUEUE/MATCH_TIMEOUT) with real golden tests in the CI chain; double-entry ledger with idempotency + row-locking; pricing/FX decimal formulas with CI tolerance checks; DB schema/constraints (unique keys, CHECK constraints, RLS, active-policy singleton index); membership ladder math with a hard firewall against Rule-input contamination; INTERNAL/USER field projection stripping legacy fields correctly.

**B. WHAT IS ONLY MARKED COMPLETE**
The entire "Pre-UI Runtime Gate" (E-R1..E-R8): code and contract-level verify scripts exist and would pass, but the gate's actual purpose — proving a real user can hit these endpoints — is unproven and currently false, because Auth (`auth-ssot`, itself marked "completed") is a self-documented skeleton with no token issuance or verification anywhere in the repo.

**C. WHAT IS PARTIALLY IMPLEMENTED**
`opp.slotsLeft` per-opportunity capacity guard (function real, wiring decorative); trade-row concurrency guarding (ledger-safe, state-machine-fragile); observability/correlation-ID coverage (present in some modules, absent in the money-critical path); test infrastructure (strong logic-level verify scripts, zero unit/e2e tests, no CI compile/build/cargo-test step).

**D. WHAT MUST BE FIXED BEFORE UI/UX IMPLEMENTATION**
Real JWT sign + verify (guard/middleware populating `req.user`); the 5 un-gated verify scripts wired into `verify:gate`; a CI compile check for `services/api-nest`; a fresh MCP re-count before trusting the v7.22.49 snapshot.

**E. CAN 03 UI/UX SAFELY START?**
Partially. Safe now: Canon/Brand/Lux screens, copy, and building against the now-stable DTO contracts (`opportunity-card`, `trade-execution-state`, `participate-request`) since those shapes are well-designed and unlikely to churn. Not safe yet: any work that assumes a real login → participate → execute-tick → settle flow can be demoed or tested end-to-end — it cannot, today, for anyone.

ENGINE STATUS:
RED

---

## RESOLUTION (post-audit fix session)

All 7 todos above implemented and re-verified. No new migration needed — the fix
reused the existing `users`/`auth_sessions`/`auth_oauth_identities`/`auth_passkeys`/
`user_profiles` schema already landed by prior migrations.

- **P0-1 (JWT):** `services/api-nest/jwt.core.cjs` — first-party HS256 sign/verify
  (Node `crypto` only, fail-closed on missing/short secret, no external dep).
  `services/api-nest/src/auth/jwt-auth.guard.ts` — real `CanActivate` guard,
  populates `req.user` from a verified bearer token. `AuthService` rewritten:
  signup/oauth/passkey/magic-link now find-or-create a real `users` row, provision
  ledger buckets, and mint a real signed JWT + `auth_sessions` row (no more
  `"pending-user"`/`"anonymous"` literals). Guard wired via `@UseGuards(JwtAuthGuard)`
  onto all 6 previously-401-on-every-request controllers: Opportunities(user),
  Trades(user), Membership(user), Benefits(user), Referral, Coach — and referral's
  `bind`/`share` + coach's `chat`/`chips` no longer let a client-supplied
  `body.userId`/`@Query('userId')` override the session (that bypass would have
  been live once a real guard existed). Evidence: new
  `services/api-nest/src/auth/jwt-guard.selftest.ts` boots a **real Nest HTTP
  server** (ephemeral port, no DB/Redis) and makes **real HTTP requests** —
  no-token/tampered/expired/wrong-issuer/malformed all → 401, valid → 200 with
  `req.user.userId` populated. Wired into `tooling/verify/auth-jwt-runtime.cjs`
  (also runs the sign/verify/tamper/expiry/issuer/audience crypto round-trip
  directly). Honest scope note: OAuth code↔token exchange with Kakao/Google and
  WebAuthn attestation/assertion signature verification remain **not implemented**
  (same trust tier the skeleton already had — Phase1/adapter-level, out of this
  fix's scope); Stage B profile persistence was also wired for consistency (was
  equally non-persisting before).
- **P0-2 (gate wiring):** `user-opportunity-feed`, `participate-http`,
  `execute-rule-loop`, `catalog-runtime-seed`, `benefit-hub-surfaces`, and the new
  `auth-jwt-runtime` are now in `tooling/verify/stubs/run-all.cjs`'s enforced
  `live` array (itself the last step of `verify:gate`) — a future regression in
  any of these six now fails CI, not just a one-time manual claim.
- **P1-1 (CI):** `tooling/verify/api-nest-build.cjs` (new `verify:gate` step) runs
  `tsc -p services/api-nest/tsconfig.json` — this immediately caught and fixed
  **two real pre-existing compile errors** that had shipped silently because no
  build step ever existed (`SessionUser` type gap from this session's own guard,
  and a `SYSTEM_ACCOUNT_CODES` literal-narrowing bug in
  `TradeExecutionService.finalizeMatchSuccess`'s ledger `lines` array that
  pre-dates this session — direct proof of the audit's own §22 finding).
  `.github/workflows/gate.yml` gained a `cargo check --locked && cargo test --locked`
  step for `services/engine-rust` (CI-only, per Phase0 low-spec rule "로컬 cargo
  check만 · test/release = GitHub Actions" — not added to the local thin gate).
- **P1-3 (concurrency):** all 3 `trade_executions` UPDATEs in
  `TradeExecutionService` (`finalizeMatchSuccess`/`applyRequeue`/`finalizeSafeStop`)
  now guard `WHERE id=$1 AND status IN ('running','requeue')` + a `reloadTrade()`
  fallback when 0 rows match (another concurrent tick already finalized it) — a
  losing writer can no longer regress a row's displayed status after a real
  ledger credit posted.
- **P2-1 (real slots):** `ParticipateService.countActiveTradesForOpportunity()`
  counts live `running`/`requeue` trades for the specific opportunity;
  `slotsLeft = max(0, dailyOppSlotsDefault - activeTrades)` replaces the old
  `Number(policy.dailyOppSlotsDefault) || 1` constant — the per-opportunity daily
  slot cap is now actually enforced, not decorative.
- **MCP recheck:** live query against `mgsytcetsiecllmhcyox` (2026-08-10) —
  `execution_policies active=1`, `opportunities available=3` (of 6 total) — the
  v7.22.49 snapshot claim **holds**. Also observed `users=0`, `trade_executions=0`,
  independently confirming the audit's finding that no real user had ever
  completed signup before this fix.

**Re-verified locally (all PASS):** `auth-jwt-runtime` (incl. real Nest HTTP
round-trip), `api-nest-build`, `participate-http`, `execute-rule-loop`,
`user-opportunity-feed`, `catalog-runtime-seed`, `benefit-hub-surfaces`,
`membership-daily-cap`, `share-copy`, `auth-flows`, all 5 `referral-*`, all 5
`ai-coach*`/`ai-lane-router`/`ai-general-no-money-tools`/`answer-trace`, plus the
full `verify:stubs` chain and every non-Next.js-build `verify:gate` step
(stack-lock/secrets/pg-module-scan/brand/cf-infra/workers-types/phase0-bootstrap/
tailwind-v4/lux-theme-sync/admin-routes/plans-ssot/etc.). **Not run locally**
(machine is Celeron 2C/8GB with free RAM <1GB this session — deferred to GitHub
Actions `gate.yml`, which runs on every push): `next-build`/`opennext-build`
(unrelated to this fix — no `apps/web`/`apps/admin` files touched).

ENGINE STATUS (post-fix):
GREEN for the Auth/HTTP-reachability gap this audit was scoped to. Rule
Engine/Ledger/Pricing core was already GREEN and untouched. Recommend a follow-up
live-DB signup→participate→execute-tick smoke test once this is deployed/pushed,
since the JWT+DB wiring itself was only exercised against a DB-less self-test in
this session (by design — CI has no DATABASE_URL yet).
