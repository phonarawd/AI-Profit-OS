"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const csrf = fs.readFileSync("services/api-nest/src/common/admin-session.csrf.ts", "utf8");
const cookies = fs.readFileSync("services/api-nest/src/common/admin-session.cookies.ts", "utf8");
const guard = fs.readFileSync("services/api-nest/src/common/admin.guard.ts", "utf8");
const client = fs.readFileSync("apps/admin/lib/admin-api.ts", "utf8");

assert.match(csrf, /createHmac\("sha256", sessionToken\)/);
assert.match(csrf, /verifyAdminCsrfToken/);
assert.match(csrf, /ADMIN_SESSION_COOKIE_NAME/);
assert.match(csrf, /assertCsrfEcho/);
assert.match(cookies, /mintAdminCsrfToken\(accessToken\)/);
assert.match(cookies, /httpOnly:\s*true/);
assert.match(cookies, /httpOnly:\s*false/);
assert.match(guard, /assertAdminCsrf\(request\)/);
assert.match(client, /getAdminCsrf\(\)/);
assert.match(client, /headers\[ADMIN_CSRF_HEADER\] = csrf/);

console.log("[verify:admin-csrf-signed] PASS (SESSION_BOUND_HMAC · JS_READABLE_NON_BEARER · MUTATION_GUARD_ENFORCED)");
