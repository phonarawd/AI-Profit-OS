# Admin Control Plane Superset (REL-400)

STATUS: LOCKED
IMPLEMENTATION_IN_THIS_REL: 0
PROTECTED_SCOPE_MUTATION: false
USER_APP_ADMIN_IA: FORBIDDEN
USER_JWT_ADMIN_200: FAIL
AUDIT_DELETE_UI: FORBIDDEN
CLIENT_LEDGER_EDIT: FORBIDDEN
SECRET_ON_SCREEN: FORBIDDEN

This file is the closure spec for kill-switch UI, audit UI, and RBAC management UI.
REL-213 / REL-214 / REL-405 / REL-406 / REL-222 implement later. REL-400 ships no Nest
route, no migration, and no live-wire of those screens.

## 0. Owner split

| Surface | UI owner | Server owner | Notes |
|---|---|---|---|
| `/admin/system-control` kill panel | REL-213 | REL-406 | Existing `money_circuit` + push kill stay; REL-406 publishes 9 IDs |
| `/admin/system-control?tab=reserve` | already live | platform reserve | Out of REL-400 mutation |
| `/admin/audit` | REL-214 | REL-405 | Consume audit schema; delete UI 0 |
| RBAC management | no 13th sidebar | REL-405 | Capability key `rbac` already exists |
| 3-mode ops | REL-222 | REL-222 + REL-405 | Terms locked here |

## 1. IA lock

- Sidebar SSOT = `apps/admin/routes.ts`. `ADMIN_TOP_LEVEL_COUNT = 12`.
- Module 9 = `/admin/system-control`. Module 12 = `/admin/audit`.
- `2b` is a child, not a 13th top-level.
- Do not copy Admin IA into `apps/web`.
- Do not add `/admin/rbac` as a top-level module.
- Reserved child (add in REL-214 or REL-405 UI, not REL-400): `/admin/audit?tab=rbac`.
- Kill-switch 9 IDs live on the default system-control panel, not a new sidebar item.

## 2. 3-mode terms (frozen)

Mode is a **server flag**. A client-only toggle is not authority.

| Mode | Meaning | Ledger / money write | Confirm |
|---|---|---|---|
| `LIVE` | Real apply after preview + confirm | Allowed only after confirm | Required |
| `DRY_RUN` | Same validation path, no persist | Forbidden | Preview only |
| `SIMULATION` | Isolated impact estimate | Forbidden | Preview only |

- Missing / unknown mode = fail-closed. Missing mode must not become `LIVE`.
- Default for a dangerous write is not `LIVE`.
- Flow lock: `preview` → `confirm` → `apply` → `result` → `rollback`.
- `LIVE` without `confirm` = FAIL (REL-222).
- `DRY_RUN` that writes the ledger = FAIL.
- `SIMULATION` that writes the production ledger = FAIL (REL-222 EXIT_GATE).
- Preview-As-User = server-scoped impersonation only. It must not mint a user JWT
  and must not grant user money write.

REL-400 only freezes the words. REL-222 enforces them in code.

## 3. Kill-switch UI contract (`/admin/system-control`)

REL-213 implements the panel. REL-406 enforces on the server.

### 3.1 Already live (do not reinvent)

| Id | Owner today | Read | Write |
|---|---|---|---|
| `money_circuit` | `MoneyCircuitService` · `/api/v1/admin/risk/circuit` | dashboard + risk | risk `circuit` capability |
| `push_kill` | `PushKillAdminController` · `/api/v1/admin/system-control/push` | dashboard | `circuit` write |
| `growth_enabled` | simulation growth gate | growth | growth write |
| `referral_accrual_halt` | referral admin | growth | `circuit` write |

These are precedents. REL-406 may wrap or replace them, but UI must not invent a
second money circuit.

### 3.2 REL-406 9 IDs

REL-406 published exactly nine frozen constants:

1. `GLOBAL_OPPORTUNITY_PAUSE`
2. `GLOBAL_MATCHING_PAUSE`
3. `GLOBAL_WITHDRAW_PAUSE`
4. `GLOBAL_DEPOSIT_PAUSE`
5. `GLOBAL_ALL_PAUSE`
6. `MONEY_CIRCUIT` (wrap `money_circuit`)
7. `PUSH_KILL` (wrap `push_kill`)
8. `GROWTH_PAUSE` (wrap `growth_enabled` — ON only)
9. `REFERRAL_ACCRUAL_HALT` (wrap `referral_accrual_halt`)

A toggle that the server does not enforce is FAIL (REL-406 EXIT_GATE).

### 3.3 UI rules (REL-213)

- Preview → confirm before any switch turns on.
- Do not let the operator edit user money buckets / journals from this page.
- Do not show secrets or tokens.
- User JWT → 200 is FAIL.
- Missing state → "확인할 수 없음". Do not paint a fake closed/open.
- Client must not compute a circuit from local sums.

## 4. Audit UI contract (`/admin/audit`)

REL-214 implements the page. REL-405 owns the write path and schema.

### 4.1 What the page may show

- Who did what, on which target, at which time, in which mode.
- Result (`preview` / `applied` / `denied` / `rolled_back`).
- Reason text already stored by the server.

### 4.2 Forbidden

- Delete / wipe / edit log UI.
- Fake ledger rows.
- Full prompt dump, raw PII, bearer tokens, signing secrets.
- Client-side reconstruction of money totals.

### 4.3 Until REL-405 exists

- No audit list API is classified today. Unclassified admin handler = 403.
- REL-214 must live-wire a real list **or** show an honest empty. Stub-only 0.
- REL-405 must classify `list` / `get` before a 200 is legal.
- If REL-405 adds a capability key, it must land in `schemas/admin-rbac.v1.json`.
  Do not invent a capability only in the page.

## 5. RBAC management UI contract

Current role SSOT = `schemas/admin-rbac.v1.json` (five roles: `super`, `finance`,
`cs`, `risk`, `marketing`). Server matrix = `admin-rbac.policy.ts`. Token claims
are not an authorization source.

REL-405 text says "8 role capability mapping". REL-400 does not invent three extra
roles. If REL-405 needs more roles, it extends the schema first. UI must not show
roles that are absent from the schema.

- Capability `rbac` (already on `super`) is the write key for matrix changes.
- Unknown role / unknown capability / unreadable matrix = deny.
- Unclassified handler = 403 even for `super`.
- RBAC UI is not a 13th sidebar module. Reserved child: `/admin/audit?tab=rbac`.
- REL-400 does not add that child route.

## 6. Capability mapping (for later handlers)

Do not invent capability names in REL-400. Reuse or extend the schema in REL-405.

| Action | Capability (current) | Level |
|---|---|---|
| Read money circuit / push kill | `circuit` or `risk` (existing handlers) | read |
| Flip kill / circuit | `circuit` | write |
| Read audit (after REL-405 classifies) | existing key or schema-added `audit` | read |
| Change role matrix | `rbac` | write |

## 7. Auth boundary

- AdminGuard + Admin JWT issuer/audience stay split from user JWT (QA8).
- User JWT on `/api/v1/admin/*` = 401.
- New admin handlers must be listed in `admin-capabilities.ts` before they can
  return 200.

## 8. What REL-400 must not ship

- New `*.admin.controller.ts`
- New `supabase/migrations/*`
- Live-wire of `apps/admin/app/admin/system-control/page.tsx`
- Live-wire of `apps/admin/app/admin/audit/page.tsx`
- Admin chrome / 12-module IA inside `apps/web`

## 9. Acceptance for later RELs

- REL-213 can implement `/admin/system-control` from §3 without a new sidebar.
- REL-214 can implement `/admin/audit` from §4 without a delete button.
- REL-405 can code the matrix + audit schema from §5–§6.
- REL-406 can publish 9 server-enforced IDs from §3.2.
- REL-222 can enforce 3-mode from §2.
