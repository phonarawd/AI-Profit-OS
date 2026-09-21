# MINE-023 — PRODUCTION PRIVATE-SCHEMA RLS HARDENING

Status: **READ-ONLY AUDIT COMPLETE / HARDENING DESIGN LOCKED / STAGING REQUIRED / PRODUCTION UNTOUCHED**  
Branch: `phase/prod-private-rls-hardening-20260922`  
Parent MINE-022 canonical SHA: `f421c380e2a2e8a3dc977752bc1795b360c81b60`  
Observed Production: `PUTDUK-DATA-PRODUCTION` (`gaugwamwceqdnqdqrxqg`)  
Safety: **No Production DDL/DML executed.**

## 1. Correction to the initial RLS advisory

The eight private tables below do have **RLS OFF**:

- `private.putduk_system_config`
- `private.push_subscriptions`
- `private.push_outbox`
- `private.work_templates`
- `private.work_template_versions`
- `private.work_orders`
- `private.task_run_items`
- `private.task_run_answers`

However, follow-up read-only privilege inspection proves that RLS-off does **not** currently equal direct anonymous/member exposure in this database.

For all eight tables at the time of inspection:

- `anon`: no effective `SELECT`, `INSERT`, `UPDATE`, or `DELETE` table privilege;
- `authenticated`: no effective `SELECT`, `INSERT`, `UPDATE`, or `DELETE` table privilege;
- `anon`: no `USAGE` on schema `private`;
- `authenticated`: no `USAGE` on schema `private`;
- `service_role`: effective `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
- `postgres`: owner-level/full table access;
- RLS policies on the eight tables: `0`.

Therefore the current finding is classified as a **defense-in-depth hardening gap and future-grant hazard**, not a confirmed direct anon/auth table-data exposure.

This correction does not make RLS-off desirable. It means the current grants/schema boundary is carrying the security boundary that RLS would otherwise reinforce.

## 2. Current direct-access boundary

The current direct boundary is deny-by-grant for client roles:

| Layer | anon | authenticated | service_role |
|---|---:|---:|---:|
| `private` schema USAGE | no | no | yes |
| eight private tables CRUD | none | none | full CRUD |
| RLS on eight tables | off | off | off |

No public view was found whose definition references any of the eight target tables.

This means an accidental future `GRANT USAGE ON SCHEMA private` plus table grant, or a newly introduced definer/RPC path, could turn RLS-off into a real exposure. That is why this remains a security hardening item.

## 3. Indirect function / trigger audit

Read-only catalog inspection found the expected server-only push/work paths plus two private trigger functions that deserve explicit hardening review.

### Push functions

Functions touching `private.push_subscriptions`, `private.push_outbox`, or `private.putduk_system_config` are not executable by `anon` or `authenticated` in the observed catalog. Service role retains execute authority.

### Work RPCs

Public work RPCs observed to touch private work tables are not executable by `anon` or `authenticated` in the observed catalog. Service role retains execute authority.

### Private trigger functions

Two functions are `SECURITY DEFINER`, owned by `postgres`, and have `proacl = NULL` (PostgreSQL default PUBLIC execute semantics):

- `private.putduk_bind_work_contract()`
- `private.putduk_materialize_work_items()`

`has_function_privilege` therefore reports execute privilege for `anon` / `authenticated`, but both functions:

- live in schema `private`, where those roles currently have no schema `USAGE`;
- return `trigger` and are trigger functions, not normal RPC-returning functions;
- use a pinned search path `pg_catalog, public, private`.

They are attached to `public.task_runs` as:

- `zz_putduk_bind_work_contract`: `BEFORE INSERT`
- `putduk_materialize_work_items`: `AFTER INSERT`

The lack of private-schema USAGE prevents direct client invocation through the current boundary. Still, explicit `REVOKE EXECUTE ... FROM PUBLIC` is preferred defense-in-depth so a future schema grant cannot silently make these definer functions callable.

## 4. Authenticated task-run trigger path

`public.task_runs` has RLS enabled and authenticated policies that allow a user to insert/select/update only rows whose `user_id = auth.uid()`.

The trigger chain was inspected read-only:

1. `BEFORE INSERT` `private.putduk_bind_work_contract()` ignores arbitrary client work IDs and resolves the active server-managed `private.work_orders` row from `new.node_id`; it then overwrites the run's work-order/template/version fields.
2. `AFTER INSERT` `private.putduk_materialize_work_items()` reads the server-bound work order/template and materializes private run items.

No path was observed in these definitions where a client-provided arbitrary private table ID is used as the authority for reading another work order/template. This is the intended server-binding pattern.

The trigger path still needs regression coverage before any RLS change because enabling RLS can interact with table ownership, SECURITY DEFINER execution, and service-role behavior.

## 5. Hardening design — staging only first

The preferred hardening sequence is additive and deny-by-default.

### Step A — explicit function privilege hardening

On isolated staging first, explicitly revoke PUBLIC execute on the two private trigger functions while preserving trigger execution:

```sql
REVOKE ALL ON FUNCTION private.putduk_bind_work_contract() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.putduk_materialize_work_items() FROM PUBLIC;
```

Do not run this on Production until staging proves task-run trigger behavior remains unchanged.

### Step B — preserve schema/table deny boundary

Assert and retain:

- no `private` schema USAGE for `anon` / `authenticated`;
- no direct CRUD grants on the eight tables for `anon` / `authenticated`;
- only required server roles have direct access.

### Step C — enable RLS on the eight tables in staging

Enable RLS only on isolated staging after dependency inventory is frozen. Because direct client access is not currently required, the default target is **no anon/auth policies** unless a concrete product path proves otherwise.

Do not mechanically add permissive policies merely to make tests pass.

### Step D — regression requirements

Staging must prove all of the following:

- service-role push subscription upsert/list/remove still works;
- push outbox enqueue/dispatch remains functional;
- system config server reads remain functional;
- authenticated `task_runs` own-row create/select/update still works;
- BEFORE work-contract binding still chooses only active/published server-managed contracts;
- AFTER item materialization still creates the correct private rows;
- work submission/review flow remains functional;
- anon cannot access private schema/tables;
- authenticated cannot directly access private schema/tables;
- direct invocation of the two private trigger functions is unavailable to client roles;
- no public view/RPC newly exposes raw server-only validation data;
- rollback is rehearsed.

## 6. Production change gate

No Production SQL proposal is approved merely by this audit.

Before any Production remediation request:

1. isolated non-Production Supabase must exist;
2. current grants and table checksums must be captured;
3. function EXECUTE hardening must be rehearsed;
4. RLS enablement must be rehearsed with real push/work regressions;
5. post-change grants/policies must be proven least-privilege;
6. rollback must be tested;
7. a separate reviewed Production migration must be prepared;
8. explicit Production approval must be obtained.

## 7. Blocker classification

`BLOCKER-PROD-PRIVATE-RLS-01` — **OPEN / HARDENING REQUIRED / NO CONFIRMED DIRECT CLIENT TABLE EXPOSURE**

Severity rationale:

- RLS is disabled on server-only private tables, so one defense layer is missing;
- current schema/table grants prevent direct `anon`/`authenticated` CRUD;
- no public view exposure was found;
- two SECURITY DEFINER trigger functions retain default PUBLIC execute semantics, but private-schema USAGE is currently denied and their return type is `trigger`;
- therefore this is a meaningful hardening issue and future-grant hazard, not evidence of current unrestricted data access.

`BLOCKER-STAGING-DB-01` remains the execution blocker. No isolated non-Production Supabase target is currently available.

**Production untouched.**
