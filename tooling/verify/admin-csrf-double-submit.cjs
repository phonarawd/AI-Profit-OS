"use strict";

/**
 * Admin signed, session-bound CSRF double-submit design proof.
 * Does not change cookie flags. HttpOnly=true on the CSRF cookie is forbidden here.
 */

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const cookies = fs.readFileSync(
  path.join(root, "services/api-nest/src/common/admin-session.cookies.ts"),
  "utf8",
);
const csrf = fs.readFileSync(
  path.join(root, "services/api-nest/src/common/admin-session.csrf.ts"),
  "utf8",
);
const runtimeTest = fs.readFileSync(
  path.join(root, "services/api-nest/src/common/admin-session.runtime.test.ts"),
  "utf8",
);

assert.match(cookies, /httpOnly:\s*true/);
assert.match(cookies, /httpOnly:\s*false/);
assert.match(cookies, /sameSite:\s*"strict"/);
assert.match(cookies, /더블서브밋/);
assert.doesNotMatch(cookies, /ADMIN_CSRF_COOKIE_NAME[\s\S]{0,120}httpOnly:\s*true/);
assert.match(csrf, /timingSafeEqual/);
assert.match(csrf, /createHmac/);
assert.match(csrf, /mintAdminCsrfToken/);
assert.match(csrf, /verifyAdminCsrfToken/);
assert.match(csrf, /ADMIN_CSRF_HEADER/);
assert.match(csrf, /aipo_admin_session/);
assert.match(csrf, /aipo_admin_csrf/);
assert.match(csrf, /planAdminLogout/);
assert.match(runtimeTest, /signed double-submit CSRF cookie stays readable but is session-bound/);
assert.match(runtimeTest, /raw csrf nonce cannot authorize a session-bound mutation/);
assert.match(runtimeTest, /signed csrf must match cookie\/header and the HttpOnly session/);
assert.match(runtimeTest, /logout with CSRF cookie only and no header is fail-closed/);
assert.match(runtimeTest, /logout with admin session cookie and no CSRF is fail-closed/);

const run = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "services/api-nest/src/common/admin-session.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 60_000 },
);
if (run.status !== 0) {
  process.stderr.write("[verify:admin-csrf-double-submit] FAIL runtime test\n");
  process.stderr.write(String(run.stderr || run.stdout || ""));
  process.exit(1);
}

console.log(
  "[verify:admin-csrf-double-submit] PASS (session HttpOnly · signed session-bound CSRF readable token · both required · HTTPONLY_CSRF_COOKIE=NOT_APPLIED)",
);
