"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  loginStaff,
  createUnreadyStaffStore,
  createMemoryStaffStore,
  ADMIN_JWT_ISSUER,
  USER_JWT_ISSUER,
} = require("./admin-staff-login.core.cjs");
const jwt = require("./jwt.core.cjs");

const SECRET = "a".repeat(32);
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fails = [];
function check(cond, msg) {
  if (!cond) fails.push(msg);
}

async function main() {
  const unready = await loginStaff(
    { email: "ops@example.com", password: "any-password-value" },
    {
      store: createUnreadyStaffStore(),
      verifyPassword: async () => true,
      adminJwtSecret: SECRET,
    },
  );
  check(unready.code === "STORE_UNREADY" && unready.applied === false, "unready store");
  check(unready.httpStatus === 503, "unready 503");

  const store = createMemoryStaffStore([
    {
      email: "ops@example.com",
      adminId: ADMIN_ID,
      role: "super",
      passwordHash: "hash-ops",
      status: "active",
    },
    {
      email: "off@example.com",
      adminId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      role: "cs",
      passwordHash: "hash-off",
      status: "disabled",
    },
  ]);

  const badPw = await loginStaff(
    { email: "ops@example.com", password: "wrong" },
    {
      store,
      verifyPassword: async (plain, encoded) => plain === "correct-staff-secret" && encoded === "hash-ops",
      adminJwtSecret: SECRET,
    },
  );
  check(badPw.code === "ADMIN_AUTH_INVALID" && badPw.ok === false, "bad password");

  const userSess = await loginStaff(
    {
      email: "ops@example.com",
      password: "correct-staff-secret",
      userAccessToken: "user.jwt.here",
    },
    {
      store,
      verifyPassword: async () => true,
      adminJwtSecret: SECRET,
    },
  );
  check(userSess.reason === "user_session_rejected", "user session rejected");

  const disabled = await loginStaff(
    { email: "off@example.com", password: "correct-staff-secret" },
    {
      store,
      verifyPassword: async () => true,
      adminJwtSecret: SECRET,
    },
  );
  check(disabled.code === "ADMIN_AUTH_INVALID", "disabled staff");

  const missing = await loginStaff(
    { email: "nobody@example.com", password: "correct-staff-secret" },
    {
      store,
      verifyPassword: async () => true,
      adminJwtSecret: SECRET,
    },
  );
  check(missing.code === "ADMIN_AUTH_INVALID", "unknown staff");

  const noSecret = await loginStaff(
    { email: "ops@example.com", password: "correct-staff-secret" },
    {
      store,
      verifyPassword: async (plain, encoded) =>
        plain === "correct-staff-secret" && encoded === "hash-ops",
      adminJwtSecret: "short",
    },
  );
  check(noSecret.code === "ADMIN_AUTH_NOT_CONFIGURED", "short admin secret");

  const ok = await loginStaff(
    { email: "ops@example.com", password: "correct-staff-secret" },
    {
      store,
      verifyPassword: async (plain, encoded) =>
        plain === "correct-staff-secret" && encoded === "hash-ops",
      adminJwtSecret: SECRET,
    },
  );
  check(ok.ok === true && ok.applied === true, "login applied");
  check(ok.adminId === ADMIN_ID && ok.role === "super", "principal");
  const claims = jwt.verify(ok.token, SECRET, {
    issuer: ADMIN_JWT_ISSUER,
    audience: "aipo-ops",
  });
  check(claims.sub === ADMIN_ID, "admin sub");
  check(claims.iss === ADMIN_JWT_ISSUER, "admin issuer");
  check(claims.iss !== USER_JWT_ISSUER, "not user issuer");

  const userTok = jwt.sign({ sub: ADMIN_ID, role: "user" }, SECRET, {
    issuer: USER_JWT_ISSUER,
    audience: "peotteok-user",
    expiresInSec: 60,
  });
  try {
    jwt.verify(userTok, SECRET, { issuer: ADMIN_JWT_ISSUER, audience: "aipo-ops" });
    fails.push("user jwt must not verify as admin");
  } catch {
    check(true, "user jwt rejected by admin verify");
  }

  const src = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "admin-staff-login.core.cjs"),
    "utf8",
  );
  check(!/demo-login|DEMO_PASSWORD|password123/.test(src), "no demo password path");
  check(!/createClient\(|@supabase\/supabase-js/.test(src), "no supabase auth client");
  void crypto;

  if (fails.length) {
    console.error("[admin-staff-login.isolation] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[admin-staff-login.isolation] PASS (memory store · STORE_UNREADY · no demo)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
