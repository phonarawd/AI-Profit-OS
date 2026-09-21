# MINE-022 — PRODUCTION PRIVATE-SCHEMA RLS ADVISORY

Status: **SUPERSEDED/CLARIFIED BY MINE-023 / REMEDIATION NOT AUTO-APPLIED**  
Observed project: `PUTDUK-DATA-PRODUCTION` (`gaugwamwceqdnqdqrxqg`)  
Observed: 2026-09-22 read-only catalog inspection  
Scope: separate from the mining compatibility bridge  
Safety: **Production unchanged.**

> Correction: the initial Supabase `rls_disabled` advisory was followed by a direct privilege/schema/function audit. RLS is OFF on the eight tables, but current `anon` and `authenticated` roles have no direct CRUD privileges on them and no `USAGE` on schema `private`. See `MINE-023-PROD-PRIVATE-RLS-HARDENING.md` for the authoritative risk classification and hardening design. Do not describe the current state as confirmed unrestricted anon/auth table exposure.

## Finding

Supabase catalog inspection reports **RLS OFF** on these eight `private` tables:

1. `private.putduk_system_config`
2. `private.push_subscriptions`
3. `private.push_outbox`
4. `private.work_templates`
5. `private.work_template_versions`
6. `private.work_orders`
7. `private.task_run_items`
8. `private.task_run_answers`

The generic Supabase advisory warns that RLS-off tables may be exposed if schema/table grants permit access. Follow-up inspection established that the current Production grants do **not** permit direct `anon`/`authenticated` CRUD on these eight tables. The remaining issue is defense-in-depth: the security boundary is currently carried by schema/table grants instead of being reinforced by RLS.

## Why this is not auto-fixed

**DO NOT auto-enable RLS** on these tables without first defining and testing the intended server access behavior.

Running only `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` can break service-role/trigger/application paths if ownership and policies are not rehearsed. Some tables are explicitly service-role/server-only data; the desired staging target is deny-by-default to client roles while preserving required server execution.

No RLS or grant mutation was executed during MINE-022 or MINE-023 read-only auditing.

## Supabase-provided mechanical remediation SQL — NOT EXECUTED

```sql
ALTER TABLE "private"."putduk_system_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."push_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."work_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."work_template_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."task_run_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "private"."task_run_answers" ENABLE ROW LEVEL SECURITY;
```

This SQL alone is **not an approved fix**. Required role/function behavior must be staged first.

## Required rehearsal before Production remediation

On isolated non-Production Supabase only:

- retain no `private` schema USAGE for `anon` / `authenticated`;
- retain no direct CRUD grants on the eight tables for `anon` / `authenticated`;
- explicitly harden PUBLIC execute on private SECURITY DEFINER trigger functions as designed in MINE-023;
- enable RLS and verify least-privilege behavior;
- run push and work/task regression tests;
- prove service-role/server trigger operations remain functional;
- prove anonymous/authenticated clients cannot directly access server-only rows;
- rehearse rollback;
- request separate Production approval.

## Blocker

`BLOCKER-PROD-PRIVATE-RLS-01` — **OPEN / HARDENING REQUIRED / NO CONFIRMED DIRECT CLIENT TABLE EXPOSURE**

MINE-023 is the authoritative detailed classification. This blocker does not authorize changing Production.

**Production unchanged.**
