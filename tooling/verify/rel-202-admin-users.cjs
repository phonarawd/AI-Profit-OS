/**
 * verify:rel-202-admin-users - /admin/users real list + PII-safe + jump
 *
 * S1F Section 9.1 (2026-09-05): this page previously had no real member
 * list at all, only a UUID-jump form with a permanently hardcoded
 * data-truth="unavailable". The launch-blocker gap is a real
 * GET /api/v1/admin/users list (services/api-nest/src/users/*) - this gate
 * requires that real wiring and forbids ever going back to the old
 * permanently-unavailable stub.
 *
 * PUTDUK continuation session (2026-09-06): page.tsx and UsersListPanel.tsx
 * are two separate files by design (the list is a dedicated client
 * component so it can carry its own filter/pagination state independently
 * of the UUID-jump form). A single needle set against only page.tsx would
 * either force the whole list markup back into page.tsx or silently stop
 * checking the list's own truth/API wiring - so each file is checked
 * structurally for its own responsibility instead (see governance/
 * release-master/evidence/REL-713-ADMIN-USERS-LIST-HANDOFF.md).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const pagePath = path.join(root, "apps/admin/app/admin/users/page.tsx");
const panelPath = path.join(root, "apps/admin/app/admin/users/UsersListPanel.tsx");
const page = fs.readFileSync(pagePath, "utf8");
const panel = fs.readFileSync(panelPath, "utf8");

// page.tsx: the UUID-jump form is an unrelated fast-path and keeps its own
// contract; the page must actually render the real list and never fall
// back to a permanent stub.
for (const needle of ["admin-user-jump", "/admin/users/${id}", "isUuid"]) {
  if (!page.includes(needle)) fails.push(`users page missing ${needle}`);
}
if (!/import\s*\{\s*UsersListPanel\s*\}\s*from\s*["']\.\/UsersListPanel["']/.test(page)) {
  fails.push("users page must import UsersListPanel from ./UsersListPanel");
}
if (!/<UsersListPanel\s*\/>/.test(page)) {
  fails.push("users page must render <UsersListPanel /> (the real member list)");
}
if (/data-truth="unavailable"/.test(page)) {
  fails.push(
    "users page must not hardcode data-truth=\"unavailable\" now that a real list API exists (services/api-nest/src/users/users.admin.controller.ts) - the truth attribute must depend on the real fetch result inside UsersListPanel",
  );
}
if (/fakeUsers|mockUsers/.test(page)) {
  fails.push("users page must not invent a member table or fixture");
}

// UsersListPanel.tsx: the real list must call the real backend, wire the
// backend's actual search/filter/sort/pagination surface, and always
// compute data-truth from the live response instead of a fixed literal.
for (const needle of ["/api/v1/admin/users", 'data-metric="user-list"', "data-truth={"]) {
  if (!panel.includes(needle)) fails.push(`UsersListPanel missing ${needle}`);
}
if (/data-truth="unavailable"/.test(panel) || /data-truth="available"/.test(panel)) {
  fails.push(
    "UsersListPanel must compute data-truth from the live fetch result, not hardcode it",
  );
}
for (const param of ["search", "status", "signupMethod", "order", "page"]) {
  if (!panel.includes(param)) fails.push(`UsersListPanel missing wiring for query param "${param}"`);
}
if (/fakeUsers|mockUsers/.test(panel)) {
  fails.push("UsersListPanel must not invent member rows");
}

// backend: unchanged hard rules from the original S1F gate.
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
// An existence check (IS [NOT] NULL, used only to classify signup_method)
// never returns the value itself and is not a leak - strip that one known
// pattern before scanning so only an actual SELECTed column would match.
const serviceSelectScan = backendServiceCode.replace(
  /password_hash\s+IS\s+(NOT\s+)?NULL/gi,
  "",
);
for (const forbidden of ["password_hash", "refresh_jti", "refresh_token_hash"]) {
  if (serviceSelectScan.includes(forbidden)) {
    fails.push(`UsersAdminService must never select ${forbidden}`);
  }
}
if (!/maskEmail/.test(backendServiceCode)) {
  fails.push("UsersAdminService must mask email in list rows (maskEmail)");
}

if (fails.length) {
  console.error("[verify:rel-202-admin-users] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-202-admin-users] PASS");
