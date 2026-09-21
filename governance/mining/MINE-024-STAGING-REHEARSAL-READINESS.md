# MINE-024 — ISOLATED STAGING REHEARSAL READINESS

Status: **PACKAGE READY / STAGING RESOURCE NOT PROVISIONED / PRODUCTION UNTOUCHED**  
Branch: `phase/mine-staging-rehearsal-readiness-20260922`  
Parent MINE-023 canonical SHA: `6806cbf5e630718aea662ae04f3d791124f5e97d`  
Production Supabase denylisted ref: `gaugwamwceqdnqdqrxqg`  
Safety: **No paid staging resource created and no Production DDL/DML executed.**

## Purpose

MINE-021 produced a real mutation E2E runner, but no isolated non-Production Supabase currently exists. MINE-022 and MINE-023 then locked the compatibility and private-RLS design without changing Production.

MINE-024 packages the exact prerequisites and go/no-go gates so an isolated staging target can be provisioned later and rehearsed without improvising around Production.

This phase does **not** create a Supabase project/branch because provisioning may incur cost and requires explicit approval.

## 1. Hard stop: Production identity

The known Production Supabase project ref is:

`gaugwamwceqdnqdqrxqg`

The PHASE21 runner already refuses this ref and refuses the known Production API host. Mutation mode must remain impossible through defaults.

Before any mutation E2E, both local configuration and the remote backend must attest a different Supabase ref.

Required remote attestation endpoint:

`GET /api/v1/internal/mining/staging-identity`

The runner must verify both:

- `supabaseProjectRef === PHASE21_EXPECTED_STAGING_SUPABASE_REF`
- `gitCommit === PHASE21_EXPECTED_BACKEND_SHA`

If either differs, mutation stops before any financial/admin write.

## 2. Required isolated staging resource

A valid target must be all of the following:

- non-Production Supabase project/branch with a ref different from `gaugwamwceqdnqdqrxqg`;
- non-Production API service with a host explicitly supplied through `PHASE21_API_BASE_URL`;
- backend deployed at one exact 40-character Git SHA;
- isolated test identities, not real customer/admin identities;
- disposable money state suitable for mutation and cleanup;
- no Production secrets except where a separately reviewed staging-safe secret is explicitly intended.

No staging resource is currently visible in connected Supabase inventory. `BLOCKER-STAGING-DB-01` therefore remains open.

## 3. Environment contract

Use `quality/mining/phase24_staging_e2e.env.example` only as a variable-name template. Never commit real secret values.

Mandatory mutation-mode variables:

- `PHASE21_E2E_MODE=mutation`
- `PHASE21_ALLOW_MUTATION_E2E=YES`
- `PHASE21_ALLOW_TRIAL_RESIDUE=YES`
- `PHASE21_API_BASE_URL`
- `PHASE21_EXPECTED_API_HOST`
- `PHASE21_EXPECTED_BACKEND_SHA`
- `PHASE21_EXPECTED_STAGING_SUPABASE_REF`
- `PHASE21_INTERNAL_MINING_TOKEN` or `INTERNAL_MINING_TICK_TOKEN`
- `JWT_ADMIN_SECRET`
- `JWT_USER_SECRET`
- `PHASE06_MAKER_ADMIN_ID`
- `PHASE06_CHECKER_ADMIN_ID`
- `PHASE21_USER_ID`

Maker/checker IDs must differ. All three identities must be dedicated staging fixtures.

## 4. Staging schema order

Do not replay the historical AI-Profit-OS migration chain wholesale onto the current PUTDUK lineage.

The rehearsal order is:

1. establish an isolated clone/branch representing the **current PUTDUK Production lineage**;
2. capture baseline schema/grants/RLS/function checksums;
3. apply only the reviewed compatibility bundle derived from MINE-022;
4. include the recovered trial prerequisites required by current mining runtime;
5. apply mining foundation/admin-control/trial-repeatability objects only after compatibility prerequisites exist;
6. stage MINE-023 private-schema hardening separately so compatibility failures and RLS failures remain distinguishable;
7. deploy the exact backend candidate;
8. run preflight mode first;
9. run mutation mode only after remote DB-ref + Git-SHA attestation passes.

The future executable compatibility migration must be authored and reviewed on a staging-only branch before any Production proposal.

## 5. Rehearsal preflight — no mutation

Run:

```bash
PHASE21_E2E_MODE=preflight node quality/mining/phase21_staging_e2e.mjs
```

Expected result:

- staging API HTTPS probe succeeds;
- Production API host is rejected by guard;
- Production Supabase ref is rejected by guard;
- no mutation flags are required;
- `mutationExecuted: false` is reported.

A preflight failure is a hard stop. Do not bypass it by changing the denylist.

## 6. Mutation E2E acceptance

After staging schema and backend are verified, mutation mode must exercise at minimum:

- maker/checker admin separation;
- mine creation;
- rate version creation;
- rate approval request;
- checker approval;
- scheduling/activation/publish;
- user principal funding through the controlled admin path;
- ordinary user start;
- increase;
- decrease;
- end;
- high-value review request;
- high-value approve;
- high-value reject path;
- trial status/start path;
- idempotency/replay protection;
- cleanup of reversible fixtures/funds;
- explicit allowance and documentation for unavoidable 24h trial residue.

The test must fail if remote Supabase ref or deployed Git SHA changes mid-run.

## 7. Database compatibility acceptance

Before mutation E2E is considered meaningful, staging DB must prove:

- current `auth.users` / `public.profiles` remain the identity SoT;
- current `public.wallet_accounts` and `private.ledger_entries` are not reinterpreted as mining balances;
- mining compatibility ledger uses `numeric(36,18)` and is isolated from current wallet accounting;
- mining user buckets start from zero unless a separately approved bridge rule exists;
- trial buckets are distinct from practice;
- `public.fx_snapshots` prerequisites exist for trial conversion;
- maker/checker approval storage exists;
- mining foundation FKs resolve against the compatibility anchors;
- ledger posting remains double-entry/idempotent;
- no Production data is required to make the rehearsal pass.

## 8. Private-schema hardening acceptance

MINE-023 hardening must be rehearsed on staging after baseline compatibility works:

- client roles retain no `private` schema USAGE;
- client roles retain no direct CRUD on the eight server-only private tables;
- PUBLIC execute is explicitly revoked from the two private SECURITY DEFINER trigger functions;
- RLS is enabled on the eight target private tables;
- no permissive anon/auth policy is added without a proven product requirement;
- service-role push/work flows remain functional;
- authenticated own-row `task_runs` flow remains functional;
- trigger binding/materialization continues to operate correctly.

## 9. Evidence bundle required to close staging blockers

Store or record:

- staging Supabase project ref;
- exact backend SHA;
- API host;
- migration list before/after;
- schema/grant/RLS assertions before/after;
- PHASE21 preflight output;
- PHASE21 mutation output;
- ordinary/high-value/trial outcome IDs from staging only;
- cleanup evidence;
- rollback rehearsal result;
- Render deploy IDs used for the staging backend/runner.

Never record JWT secrets, service-role keys, passwords, or database credentials in governance artifacts.

## 10. Blockers after package completion

- `BLOCKER-STAGING-DB-01` — **OPEN**: no isolated staging Supabase resource exists.
- `BLOCKER-STAGING-E2E-01` — **OPEN**: mutation runner is ready but has not run against isolated staging.
- `BLOCKER-DB-BASELINE-COMPAT-01` — **DESIGN READY / EXECUTION BLOCKED BY STAGING**.
- `BLOCKER-PROD-PRIVATE-RLS-01` — **HARDENING DESIGN READY / EXECUTION BLOCKED BY STAGING**.
- `BLOCKER-PROD-MIGRATION-01` — **OPEN BY DESIGN**: no Production migration until staging rehearsal and explicit Production approval.

## 11. Next authorization boundary

The next irreversible/cost-bearing action is provisioning or selecting an isolated Supabase staging resource. This package does not authorize that action.

Until an isolated staging target exists, continue only with repo-side migration drafting/static review and read-only Production inspection.

**Production untouched.**
