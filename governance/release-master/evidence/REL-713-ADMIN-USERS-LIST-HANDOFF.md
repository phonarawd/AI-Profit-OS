# REL-713 - Admin members directory: backend complete, frontend blocked mid-edit

Date: 2026-09-05 (S1F session)

## Status

- **Backend: DONE, committed, tested.** `GET /api/v1/admin/users` (paginated,
  searchable, filterable by status/signup method, sortable, PII-masked) and
  `GET /api/v1/admin/users/:id` (unmasked single-record detail). See
  `services/api-nest/src/users/users.admin.controller.ts` +
  `users-admin.service.ts`, RBAC via the existing `users` capability
  (`schemas/admin-rbac.v1.json` cs/super), audit-logged
  (`admin.users.list`/`admin.users.get`). Verified via `pnpm
  verify:admin-boundary` (27 admin controllers / 121 routes classified,
  including this one, full adversarial Nest+HTTP RBAC round-trip PASS).
- **Frontend: component written and working, but NOT wired into the route.**
  `apps/admin/app/admin/users/UsersListPanel.tsx` exists, compiles cleanly,
  and contains the real list UI (fetches `/api/v1/admin/users`, renders the
  total count with a truthful `data-truth` state, renders each row with a
  link to the existing per-user detail page). `apps/admin/app/admin/users/
  page.tsx` itself could **not** be edited this session - every attempt
  (10 total: full-file `Write` with large content, full-file `Write` with
  minimal content, `StrReplace` with a large block, `StrReplace` with a
  tiny block, `StrReplace` with a single-line import addition) was rejected
  by the editor tooling with `Blocked: malformed hook input` before any
  diff was ever produced (confirmed via `git diff --stat` showing zero
  changes to this exact file after every attempt). A sibling new file at
  the same path depth (`UsersListPanel.tsx`) wrote successfully on the
  first try, isolating the block to this one specific file path rather than
  to directory, content, or file size.

## Exact change needed to finish this (three lines)

In `apps/admin/app/admin/users/page.tsx`:

1. Add an import:
   ```ts
   import { UsersListPanel } from "./UsersListPanel";
   ```
2. Render it inside the existing `<main data-testid="admin-users">` block,
   above or below the current UUID-jump form (both can coexist - the jump
   form stays as a fast-path for an admin who already has a specific member
   id copied):
   ```tsx
   <UsersListPanel />
   ```
3. Remove the old permanently-static block:
   ```tsx
   <section
     className="mt-6 rounded border border-lux-border p-4"
     data-metric="user-list"
     data-truth="unavailable"
   >
     <h2 className="text-base font-medium">전체 회원 수</h2>
     <p className="mt-2">
       <AdminTruth value={null} testId="admin-users-list" />
     </p>
     <p className="mt-1 text-xs text-lux-text-muted">
       전체 회원 목록 연결이 아직 준비되지 않았습니다. 회원 번호를 알고 있는 회원은 아래에서 찾을 수 있습니다.
     </p>
   </section>
   ```
   (`UsersListPanel` renders its own equivalent section with the real,
   dynamic `data-truth`, so this old static block becomes redundant once
   step 2 lands.)

## Verify script update prepared but not committed

`tooling/verify/rel-202-admin-users.cjs` was updated this session to require
the real `/api/v1/admin/users` wiring and to forbid the permanent
`data-truth="unavailable"` stub, then **reverted** before commit specifically
because committing it while `page.tsx` itself could not be updated would
land a known-failing gate, which this task's own rules forbid ("게이트
약화로 '통과' 만들기 금지" cuts both ways - landing a stricter gate that is
known-red is the same class of problem as weakening one). The updated
script content is preserved below verbatim so it can be reapplied in the
same commit as the three-line page.tsx fix above:

```js
/**
 * verify:rel-202-admin-users - /admin/users real list + PII-safe + jump
 *
 * S1F Section 9.1 (2026-09-05): this page previously had no real member
 * list at all, only a UUID-jump form with a permanently hardcoded
 * data-truth="unavailable". The launch-blocker gap is a real
 * GET /api/v1/admin/users list (services/api-nest/src/users/*) - this gate
 * is updated to require that real wiring and to forbid ever going back to
 * the old permanently-unavailable stub.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const page = fs.readFileSync(
  path.join(root, "apps/admin/app/admin/users/page.tsx"),
  "utf8",
);

if (page.includes("Admin \u00a79.1.1 \uace8\uaca9") && !page.includes("user-list")) {
  fails.push("users list must not stay stub-only");
}
for (const needle of [
  'data-metric="user-list"',
  "admin-user-jump",
  "/admin/users/${id}",
  "isUuid",
  "/api/v1/admin/users",
]) {
  if (!page.includes(needle)) fails.push(`users page missing ${needle}`);
}
if (/data-truth="unavailable"/.test(page)) {
  fails.push(
    "users list must not permanently hardcode data-truth=unavailable now that a real list API exists (services/api-nest/src/users/users.admin.controller.ts) - the truth attribute must depend on the real fetch result",
  );
}
if (/fakeUsers|mockUsers|\ud68c\uc6d0 \uc218.*=.*0/.test(page)) {
  fails.push("users page must not invent a member table or zero count");
}

const backendController = fs.readFileSync(
  path.join(root, "services/api-nest/src/users/users.admin.controller.ts"),
  "utf8",
);
if (!/@UseGuards\(AdminGuard\)/.test(backendController)) {
  fails.push("UsersAdminController must be @UseGuards(AdminGuard)");
}
const backendServiceRaw = fs.readFileSync(
  path.join(root, "services/api-nest/src/users/users-admin.service.ts"),
  "utf8",
);
const backendServiceCode = backendServiceRaw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
for (const forbidden of ["password_hash", "refresh_jti", "refresh_token_hash"]) {
  if (backendServiceCode.includes(forbidden)) {
    fails.push(`UsersAdminService must never select ${forbidden}`);
  }
}

if (fails.length) {
  console.error("[verify:rel-202-admin-users] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-202-admin-users] PASS");
```

## Result

`ADMIN_USERS_LIST_BACKEND` = DONE. `ADMIN_USERS_LIST_FRONTEND` =
COMPONENT_READY_NOT_WIRED (tool-blocked, not a design or implementation
gap - the fix is a 3-line, already-fully-specified change above).
