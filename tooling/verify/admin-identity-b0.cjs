/**
 * verify:admin-identity-b0 — S3 / B0
 * Personal admin login, durable session, MFA wrap, maker-checker self-approval 0.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const migration = read("supabase/migrations/20260906120000_admin_identity_sessions.sql");
for (const table of [
  "admin_credentials",
  "admin_totp",
  "admin_backup_codes",
  "admin_sessions",
  "admin_login_challenges",
  "admin_code_exchanges",
  "admin_approval_requests",
]) {
  if (!migration.includes("public." + table)) fail("migration missing " + table);
}
if (!migration.includes("secret_ciphertext")) {
  fail("TOTP must be ciphertext, not hash-only");
}
if (!migration.includes("admin_approval_no_self_chk")) {
  fail("maker-checker self-approval constraint missing");
}

const policy = read("services/api-nest/src/common/admin-identity.policy.ts");
if (!policy.includes("ADMIN_RESERVED_IDENTIFIERS")) fail("reserved identifiers missing");
if (!policy.includes("ADMIN_SELF_APPROVAL_FORBIDDEN")) fail("self-approval deny missing");

const totp = read("services/api-nest/src/common/admin-totp.ts");
if (!totp.includes("aes-256-gcm")) fail("TOTP wrap must be AES-256-GCM");
if (!totp.includes("hashBackupCode")) fail("backup codes must be hashed");

const flow = read("services/api-nest/src/common/admin-auth.flow.ts");
if (!flow.includes("startAdminPasswordLogin") || !flow.includes("finishAdminMfaLogin")) {
  fail("password + MFA login flow missing");
}
if (!flow.includes("mintEmergencyCodeSession")) {
  fail("connection-code session must be a distinct emergency kind");
}

const store = read("services/api-nest/src/common/admin-session.store.ts");
if (!store.includes("createMemoryAdminIdentityStore")) fail("durable store missing");

const guard = read("services/api-nest/src/common/admin.guard.ts");
if (!guard.includes("resolveAdminSession")) fail("AdminGuard must read durable session");
if (!guard.includes("ADMIN_STEPUP_REQUIRED")) fail("step-up gate missing");
if (!guard.includes("ADMIN_CODE_EXCHANGE_READ_ONLY")) {
  fail("connection-code write deny missing");
}

const loginUi = read("apps/admin/components/AdminLoginForm.tsx");
if (!loginUi.includes("identifier") || !loginUi.includes('type="password"')) {
  fail("login form must use identifier + secret field");
}
if (loginUi.includes("connectAdminSession")) {
  fail("login form must not exchange a connection code");
}
if (!loginUi.includes("TurnstileField") || !loginUi.includes('action="admin-login"')) {
  fail("login form must fail-closed with Turnstile admin-login");
}

const authCtrl = read("services/api-nest/src/common/admin-auth.controller.ts");
if (!/@Post\("login"\)[\s\S]{0,120}@UseGuards\(TurnstileGuard\)/.test(authCtrl)) {
  fail("password login must stay behind Turnstile");
}
if (/@Post\("mfa"\)[\s\S]{0,80}@UseGuards\(TurnstileGuard\)/.test(authCtrl)) {
  fail("MFA must not replay the login Turnstile token");
}

const page = read("apps/admin/app/admin/login/page.tsx");
if (!page.includes("AdminLoginForm")) fail("login route missing");

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("admin-identity-b0")) {
  fail("CATALOG.md must list admin-identity-b0");
}

const isolation = read("tooling/verify/admin-code-exchange-isolation.cjs");
if (isolation.includes("do not invent a product admin password login")) {
  fail("isolation verify still forbids the S3 login path");
}

const run = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "services/api-nest/src/common/admin-identity.runtime.test.ts",
    "services/api-nest/src/common/admin-session.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 180_000 },
);
if (run.status !== 0) {
  fail("runtime tests failed");
  process.stderr.write(String(run.stderr || run.stdout || ""));
}

if (fails.length) {
  console.error("[verify:admin-identity-b0] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:admin-identity-b0] PASS (login+MFA · durable session · step-up · maker-checker self-approval 0)",
);
