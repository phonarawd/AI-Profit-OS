import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  assertAdminCsrf,
  mintAdminCsrfSecret,
  planAdminLogout,
  requestHasQueryBearer,
} from "./admin-session.csrf.ts";
import {
  isAdminAccessTokenRevoked,
  revokeAdminAccessToken,
} from "./admin-session.revoke.ts";

test("query-string bearer is rejected", () => {
  assert.equal(requestHasQueryBearer("/admin?access_token=x"), true);
  assert.equal(requestHasQueryBearer("/admin?token=x"), true);
  assert.equal(requestHasQueryBearer("/admin?bearer=x"), true);
  assert.equal(requestHasQueryBearer("/admin?tab=review"), false);
});

test("csrf must match cookie and header", () => {
  const csrf = mintAdminCsrfSecret();
  assert.equal(csrf.length, 64);
  assertAdminCsrf({
    cookies: { aipo_admin_csrf: csrf },
    headers: { "x-admin-csrf": csrf },
  });
  assert.throws(
    () =>
      assertAdminCsrf({
        cookies: { aipo_admin_csrf: csrf },
        headers: { "x-admin-csrf": mintAdminCsrfSecret() },
      }),
    /ADMIN_CSRF_INVALID/,
  );
  assert.throws(() => assertAdminCsrf({ cookies: {}, headers: {} }), /ADMIN_CSRF_INVALID/);
});

test("logout revoke blocks the same token hash", () => {
  const token = "admin-access-token-fixture";
  assert.equal(isAdminAccessTokenRevoked(token), false);
  revokeAdminAccessToken(token, Date.now() + 60_000);
  assert.equal(isAdminAccessTokenRevoked(token), true);
});

test("logout with admin session cookie and no CSRF is fail-closed", () => {
  const token = `logout-no-csrf-${Date.now()}`;
  assert.deepEqual(
    planAdminLogout({
      cookies: { [ADMIN_SESSION_COOKIE_NAME]: token },
      headers: {},
    }),
    { action: "reject_csrf" },
  );
  assert.equal(isAdminAccessTokenRevoked(token), false);
});

test("logout with CSRF cookie only and no header is fail-closed", () => {
  const csrf = mintAdminCsrfSecret();
  assert.deepEqual(
    planAdminLogout({
      cookies: { [ADMIN_CSRF_COOKIE_NAME]: csrf },
      headers: {},
    }),
    { action: "reject_csrf" },
  );
});

test("logout with matching CSRF plans revoke and clear", () => {
  const token = `logout-csrf-ok-${Date.now()}`;
  const csrf = mintAdminCsrfSecret();
  assert.deepEqual(
    planAdminLogout({
      cookies: {
        [ADMIN_SESSION_COOKIE_NAME]: token,
        [ADMIN_CSRF_COOKIE_NAME]: csrf,
      },
      headers: { "x-admin-csrf": csrf },
    }),
    { action: "revoke_and_clear", token },
  );
});

test("logout without admin cookies is a no-op and does not Set-Cookie", () => {
  assert.deepEqual(planAdminLogout({ cookies: {}, headers: {} }), {
    action: "noop",
  });
});

test("logout with leftover CSRF cookie and matching header clears only", () => {
  const csrf = mintAdminCsrfSecret();
  assert.deepEqual(
    planAdminLogout({
      cookies: { [ADMIN_CSRF_COOKIE_NAME]: csrf },
      headers: { "x-admin-csrf": csrf },
    }),
    { action: "clear_only" },
  );
});

test("planned revoke_and_clear invalidates that token", () => {
  const token = `logout-revoke-${Date.now()}`;
  const csrf = mintAdminCsrfSecret();
  const plan = planAdminLogout({
    cookies: {
      [ADMIN_SESSION_COOKIE_NAME]: token,
      [ADMIN_CSRF_COOKIE_NAME]: csrf,
    },
    headers: { "x-admin-csrf": csrf },
  });
  assert.equal(plan.action, "revoke_and_clear");
  if (plan.action === "revoke_and_clear") {
    revokeAdminAccessToken(plan.token, Date.now() + 60_000);
  }
  assert.equal(isAdminAccessTokenRevoked(token), true);
});

test("double-submit CSRF cookie stays readable and is not the session secret", () => {
  const src = fs.readFileSync(
    path.join(import.meta.dirname, "admin-session.cookies.ts"),
    "utf8",
  );
  assert.match(src, /httpOnly:\s*true/);
  assert.match(src, /httpOnly:\s*false/);
  assert.match(src, /sameSite:\s*"strict"/);
  assert.match(src, /더블서브밋/);
  const session = "admin-access-token-fixture";
  const csrf = mintAdminCsrfSecret();
  assert.notEqual(session, csrf);
  assert.ok(csrf.length >= 32);
  assertAdminCsrf({
    cookies: { [ADMIN_CSRF_COOKIE_NAME]: csrf },
    headers: { "x-admin-csrf": csrf },
  });
});
