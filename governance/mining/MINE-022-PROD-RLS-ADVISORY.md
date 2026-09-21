# MINE-022 — PRODUCTION PRIVATE-SCHEMA RLS ADVISORY

Status: **CRITICAL SECURITY ADVISORY / REMEDIATION NOT AUTO-APPLIED**  
Observed project: `PUTDUK-DATA-PRODUCTION` (`gaugwamwceqdnqdqrxqg`)  
Observed: 2026-09-22 read-only catalog inspection  
Scope: separate from the mining compatibility bridge  
Safety: **Production unchanged.**

## Finding

Supabase catalog inspection currently reports **RLS OFF** on these eight `private` tables:

1. `private.putduk_system_config`
2. `private.push_subscriptions`
3. `private.push_outbox`
4. `private.work_templates`
5. `private.work_template_versions`
6. `private.work_orders`
7. `private.task_run_items`
8. `private.task_run_answers`

Supabase reports this as a critical `rls_disabled` advisory and warns that tables without RLS may be exposed to the `anon` / `authenticated` roles used by Supabase client libraries, depending on grants/schema exposure.

## Why this is not auto-fixed

**DO NOT auto-enable RLS** on these tables without first defining and testing access policies.

Running only `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` can immediately deny application access that currently depends on these tables. Because some are explicitly described as service-role/server-only data, the intended end state may be deny-by-default for client roles, but that must be proven against actual runtime paths on isolated staging first.

No RLS or grant mutation was executed during MINE-022.

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

This SQL alone is **not an approved fix**. Required policies/grants must be designed first.

## Required rehearsal before Production remediation

On isolated non-Production Supabase only:

- inventory every API/server/client read/write path touching the eight tables;
- inspect current grants to `anon`, `authenticated`, `service_role`, and server DB roles;
- classify each table as service-only, admin-only, member-self, or mixed access;
- add least-privilege RLS policies and/or revoke unnecessary role grants;
- run consumer/admin/backend regression tests;
- verify push subscription registration/delivery and work-run flows;
- prove service-role/server operations remain functional;
- prove anonymous/authenticated clients cannot read or mutate server-only rows;
- rehearse rollback;
- request separate Production approval.

## Blocker

`BLOCKER-PROD-PRIVATE-RLS-01` — **OPEN / CRITICAL / SEPARATE FROM MINING RELEASE MIGRATION**

This blocker does not authorize changing Production during MINE-022. It must be remediated through a separately reviewed security change after staging rehearsal.

**Production unchanged.**
