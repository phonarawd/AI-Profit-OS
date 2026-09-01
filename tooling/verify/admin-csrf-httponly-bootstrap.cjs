"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const cookies = fs.readFileSync("services/api-nest/src/common/admin-session.cookies.ts", "utf8");
const controller = fs.readFileSync("services/api-nest/src/common/admin-session.controller.ts", "utf8");
const client = fs.readFileSync("apps/admin/lib/admin-session.ts", "utf8");
const api = fs.readFileSync("apps/admin/lib/admin-api.ts", "utf8");

assert.doesNotMatch(cookies, /httpOnly:\s*false/);
assert.match(cookies, /attachAdminCsrfCookie/);
assert.match(controller, /csrfToken/);
assert.match(controller, /Cache-Control", "no-store"/);
assert.match(controller, /attachAdminCsrfCookie\(res, csrfToken\)/);
assert.doesNotMatch(client, /document\.cookie/);
assert.match(client, /let adminCsrfToken: string \| null = null/);
assert.match(client, /ensureAdminCsrf/);
assert.match(api, /await ensureAdminCsrf\(\)/);

console.log("[verify:admin-csrf-httponly-bootstrap] PASS");
