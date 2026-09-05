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

## Resolution (2026-09-06, PUTDUK continuation session)

- Reproduced the same Write/StrReplace "malformed hook input" block on
  this exact file on the first attempt (confirms this is a real, repo-wide
  tool limitation, not something specific to the previous session or to
  this one file). Root-caused it empirically instead of guessing: the
  block triggers specifically when a single tool-call argument combines a
  literal double-quote character with adjacent multi-byte Korean text in
  the same short span; Korean text alone (no embedded quotes right next
  to it) and pure-ASCII payloads of any size both go through cleanly.
  Verified with isolated round-trip tests before touching any real file.
- Applied the fix per this task's own instruction (Node fs.readFileSync/
  writeFileSync, not the same blocked method repeated): wrote a small
  temp .cjs patch script (pure ASCII source, no Korean literals at all)
  that locates page.tsx's edit points by ASCII-only anchors (the
  AdminTruth import line, the data-metric="user-list" attribute, the
  closing section tag) and splices in the 3-line change described above,
  so the script itself never needs to contain the Korean text it edits
  around. Confirmed with git diff --stat (2 insertions / 14 deletions -
  the import swap plus stub removal, nothing else) and git diff --check
  (clean) after normalizing line endings back to the file's original
  LF-only convention - the edit tooling on this Windows session
  intermittently re-saved files as CRLF regardless of the original
  convention, so every edit in this session was checked and
  re-normalized whenever that happened.
- apps/admin/app/admin/users/page.tsx: now imports and renders
  UsersListPanel in place of the permanent stub; the AdminTruth import
  (only used by the removed stub) was dropped to avoid an unused-import
  error; the UUID-jump form is unchanged.
- apps/admin/app/admin/users/UsersListPanel.tsx: rewritten (the new file
  content has no Korean-plus-quote combination either, so it wrote
  directly) to wire the backend's real search, status filter, signup-
  method filter, order toggle, and page navigation, with loading, empty,
  error-plus-retry, and truthful total-count states - all copy sourced
  from packages/ui/copy/ko/admin.ts (T.admin.usersList.*), no hardcoded
  Korean strings in the component per korean-ui.mdc.
- tooling/verify/rel-202-admin-users.cjs: reapplied the structural
  version prepared in this doc, adapted exactly as this task's own
  instructions required - split into a page.tsx check (jump form intact,
  imports and renders UsersListPanel, never hardcodes the permanent
  unavailable truth again) and a UsersListPanel.tsx check (calls the real
  endpoint, wires every backend filter param, computes its truth
  attribute from the live response). Also fixed a false-positive in the
  backend PII scan: the original needle list flagged the SQL fragment
  that checks password_hash IS NOT NULL (an existence check used only to
  classify signup_method, never returning the hash) as if it were a
  leaked column - narrowed the scan to exclude that one known-safe
  pattern before checking for an actual SELECTed forbidden column.
- Verified: node tooling/verify/rel-202-admin-users.cjs PASS,
  verify:admin-novice-ui PASS, verify:admin-routes PASS, verify:korean-ui
  PASS, scoped tsc --noEmit -p apps/admin/tsconfig.json clean.
- ADMIN_USERS_LIST_FRONTEND = DONE (superseding COMPONENT_READY_NOT_WIRED
  above - kept verbatim as the historical record of what was blocked and
  why).
