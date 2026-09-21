# MINE-022 — CURRENT PRODUCTION BASELINE COMPATIBILITY DESIGN

Status: **DESIGN LOCKED / STAGING REHEARSAL REQUIRED / PRODUCTION UNTOUCHED**  
Branch: `phase/mine-prod-baseline-compat-20260922`  
Parent PHASE21 closure: `9a917905e16399fd7d5acc297e4790ccd462be54`  
Canonical mining backend implementation: `72bb62e59f9d472229a7160f8ac5565175d939da`  
Current Production Supabase ref: `gaugwamwceqdnqdqrxqg`  
Safety: **This phase does not apply DDL or DML to Production.**

## 1. Finding: this is a lineage bridge, not a missing-migration replay

Read-only Production migration history shows the currently connected database starts its present PUTDUK lineage at:

`20260916192740 putduk_foundation`

and continues through the current `putduk_*` / phase migrations. The historical AI-Profit-OS Nest-auth/ledger chain from August 2026 and the 2026-09-02 `production_schema_parity` migration are not present in this current migration history.

The AI-Profit-OS repository nevertheless contains `20260902032000_production_schema_parity.sql`, whose header says it was generated from read-only Production catalog truth on 2026-09-02 and whose DDL assumes objects such as `public.users` and `public.ledger_journals` existed in that older Production generation.

Therefore the connected Production database has been rebuilt/relineaged since that historical authority. `BLOCKER-DB-BASELINE-COMPAT-01` is not solved by replaying old migrations. A compatibility layer must explicitly connect the current PUTDUK schema generation to the mining backend's financial model.

## 2. Current Production sources of truth that MUST remain authoritative

### User identity

Current SoT:

- Supabase `auth.users`
- `public.profiles(id)` as the application user/profile anchor

Mining compatibility MUST NOT recreate the historical Nest-auth `public.users` identity model or make it authoritative again.

All adapted mining user FKs should target the current user identity (`public.profiles(id)`) directly, or an explicitly non-authoritative compatibility anchor whose only key is derived from `public.profiles(id)`. Direct `public.profiles(id)` FKs are preferred because mining runtime code does not query historical `public.users`.

### Current PUTDUK wallet

Current SoT:

- `public.wallet_accounts`
- precision: `numeric(18,2)`
- current product buckets include work/task/referral/support/available/held semantics

Mining MUST NOT reinterpret these rows as mining `principal`, `profit`, `locked`, `trial_principal`, or `trial_locked` balances.

### Current PUTDUK ledger

Current SoT:

- `private.ledger_entries`
- current-generation single-entry operational ledger
- precision: `numeric(18,2)`

Mining MUST NOT map this table directly into the historical double-entry mining journal model.

### Current admin authority

Current SoT:

- admin JWT claims validated by `AdminGuard`
- server capability matrix (`admin-rbac.policy.ts` / capability classification)
- current role membership in `private.admin_roles`

Historical `public.admin_rbac` MUST NOT become an authorization SoT. Mining service inspection confirms `AdminGuard` makes access decisions from JWT + server policy, not from `public.admin_rbac` queries.

## 3. Why current wallet/ledger reuse is rejected

The current and mining financial models differ materially:

| Dimension | Current PUTDUK wallet/ledger | Mining ledger contract |
|---|---|---|
| Precision | `numeric(18,2)` | `numeric(36,18)` |
| Primary semantics | work/task/referral/support/available/held | principal/profit/locked/practice/trial_principal/trial_locked |
| Journal model | current private operational entries | balanced double-entry journal + immutable entries |
| Truth currency | KRW/USDT current product flows | USDT mining truth ledger |
| Mutation guard | current PUTDUK services/RLS | `app.ledger_posting` guarded posting service |
| Idempotency | current operation-specific | stable financial journal idempotency keys |

A direct mapping would silently couple mining liabilities to unrelated work/task money and lose 18-decimal mining precision. This option is **REJECTED**.

No automatic current-wallet balance import is permitted. A future explicit funding bridge, if product policy requires one, must be separately designed, reconciled, idempotent, reversible in staging, and explicitly approved.

## 4. Preferred compatibility architecture

The preferred minimal-risk direction is an **additive, isolated mining financial domain** while preserving current PUTDUK identity/admin SoTs.

### 4.1 Identity adaptation

Adapt historical mining/trial FKs as follows:

- `mine_positions.user_id` -> `public.profiles(id)`
- `mine_trial_sessions.user_id` -> `public.profiles(id)`
- `mine_high_value_reviews.user_id` -> `public.profiles(id)`
- `trial_grants.user_id` -> `public.profiles(id)`
- `trial_user_state.user_id` -> `public.profiles(id)`
- mining ledger `owner_user_id` -> `public.profiles(id)`

Do not create a second login/auth user table.

Admin actor UUID columns should be treated as audit actors, not permission sources. Where referential integrity is desirable, they may reference `public.profiles(id)` after staging proves every admin JWT subject has a corresponding profile. They MUST NOT reference a recreated historical RBAC authority.

### 4.2 Isolated mining double-entry ledger

Mining still needs the semantics currently implemented by `LedgerPostingService`:

- account code
- owner user ID
- bucket
- currency
- `numeric(36,18)` balance
- journal type/reference/idempotency
- immutable debit/credit entries
- balanced journal enforcement
- `ledger_outbox_events`
- `app.ledger_posting` mutation guard

The release-minimal compatibility shape MAY retain the existing backend-facing names:

- `public.ledger_accounts`
- `public.ledger_journals`
- `public.ledger_entries`
- `public.ledger_outbox_events`

but in the current Production generation these objects are to be documented and treated as the **isolated mining double-entry compatibility ledger**, not as replacements for `public.wallet_accounts` or `private.ledger_entries`.

This choice minimizes financial-service code changes and preserves already verified posting/idempotency behavior. If staging review finds the generic names too risky operationally, the alternative is a backend refactor to `mining_ledger_*`; that alternative requires a new canonical backend verification cycle and must not be mixed into the first DB rehearsal.

### 4.3 Opening balances

All user mining buckets start at **zero** in the compatibility ledger.

The compatibility migration MUST NOT:

- copy `wallet_accounts.available_amount`
- copy `wallet_accounts.held_amount`
- aggregate `private.ledger_entries`
- infer principal from deposits/tasks/work balances
- create synthetic profit

System mining/trial accounts may be provisioned exactly as required by the verified double-entry design, but any real user principal funding path must be explicit and separately reconciled.

### 4.4 Trial prerequisites

The trial runtime additionally requires:

- `trial_program_config`
- `trial_grants`
- `trial_user_state`
- `trial_settlements`
- `trial_principal` / `trial_locked` ledger buckets
- `public.fx_snapshots` with a valid `usd_krw > 0` row
- historical grant source semantics `SYS:OPS_POOL -> user.trial_principal`
- stable idempotency `trial:trial_grant_welcome:{userId}`

The recovered historical trial migration cannot be replayed wholesale because it also assumes the old identity/ledger lineage. Its trial-specific objects must be extracted/adapted into the compatibility bundle.

### 4.5 Admin runtime support

Rate maker/checker flow genuinely reads/writes `public.admin_approval_requests`; it is not only a foreign-key placeholder. Minimum runtime state observed in `MiningAdminService` includes:

- `id`
- `action_type`
- `payload`
- `maker_admin_id`
- `checker_admin_id`
- `status`
- `reason`
- `decided_at`

This table is approval workflow state, not authorization SoT. Actor IDs must remain current-user identities; authorization remains JWT/server policy.

Mining admin idempotency/audit paths also depend on the historical public admin audit stream. The first staging compatibility rehearsal may preserve that backend-facing audit table to minimize code changes, but it must be explicitly labeled mining compatibility audit and must not displace current `private.admin_audit_logs` as the current PUTDUK admin audit system. A later one-way projection/adapter can be evaluated only after the mining release path is stable.

### 4.6 Kill switch support

`KillSwitchService` currently queries `public.admin_kill_switches` when the table exists and falls back only on undefined-table errors. Mining IDs added by `20260921162500_mining_admin_controls_v1.sql` therefore need to be present in the isolated rehearsal.

Existing current PUTDUK controls must not be silently renamed or overwritten. The compatibility rehearsal must verify the exact overlay behavior before Production is considered.

## 5. Historical migrations that MUST NOT be replayed wholesale

The following are historical evidence/reference, not direct Production migration candidates:

- `20260808205844_identity_nest_auth.sql`
- `20260808205846_ledger_accounts_journals.sql`
- `20260808205848_wallet_deposit_withdraw.sql`
- `20260808205901_rls_ledger_guards.sql`
- `20260902032000_production_schema_parity.sql`
- `20260905110000_classic_signup_sessions_and_admin.sql`
- `20260909040657_trial_welcome_grant.sql`
- `20260920134053_mining_foundation_v1.sql`

They encode a prior database generation, including an independent Nest-auth user model and broad RLS assumptions incompatible with current PUTDUK Production.

Their mining-specific invariants may be extracted into a **new compatibility migration authored against the current PUTDUK baseline** only after isolated staging exists.

## 6. Compatibility migration acceptance criteria

A future executable compatibility migration is not allowed into `supabase/migrations/` until all of these are proven on isolated staging:

1. current baseline starts from a copy/branch of the present PUTDUK schema generation;
2. `public.profiles` remains user identity anchor;
3. existing `public.wallet_accounts` rows and balances are byte/row-value unchanged;
4. existing `private.ledger_entries` rows are unchanged;
5. mining financial tables use `numeric(36,18)`;
6. all mining user buckets begin at zero unless an independently approved funding fixture is applied;
7. no historical `public.users` auth model is recreated as session authority;
8. admin JWT/server capability authorization remains unchanged;
9. maker/checker approval state works against current admin identities;
10. trial grant can resolve a valid FX snapshot and posts only to trial buckets;
11. PHASE21 remote DB-ref + backend-SHA attestation passes;
12. PHASE21 ordinary/high-value/trial mutation E2E passes;
13. row-count/checksum reconciliation proves current wallet/current ledger no-regression;
14. rollback/recovery procedure is rehearsed before any Production request.

## 7. Recommended compatibility rehearsal sequence

On a future isolated non-Production Supabase target only:

1. establish current PUTDUK baseline identity and checksums;
2. install the adapted isolated mining ledger foundation;
3. install adapted trial prerequisites and FX prerequisite/fixture;
4. install adapted mining domain tables using `profiles` FKs;
5. install approval/audit/kill-switch support required by mining runtime;
6. seed only system accounts/config necessary for the isolated test;
7. assert all real user mining buckets are zero;
8. deploy exact PHASE21 backend build and attest SHA + Supabase ref;
9. run PHASE21 mutation E2E with dedicated fixtures;
10. compare pre/post current wallet and private-ledger checksums;
11. discard/revert the staging target and repeat from clean baseline once;
12. only then prepare an executable migration proposal for separate Production approval.

## 8. Blocker status

### BLOCKER-DB-BASELINE-COMPAT-01 — DESIGN DECOMPOSED / EXECUTION OPEN

The incompatibility is now decomposed into explicit identity, ledger, trial, admin-approval, audit, kill-switch, and FX adaptation requirements. It remains open until the compatibility bundle is rehearsed on isolated staging.

### BLOCKER-STAGING-DB-01 — OPEN

No isolated non-Production Supabase target is currently available in the connected project inventory. Provisioning may incur cost and requires explicit approval.

### BLOCKER-PROD-MIGRATION-01 — OPEN / INTENTIONALLY GATED

No compatibility or mining migration has been applied to Production.

**Production untouched.**
