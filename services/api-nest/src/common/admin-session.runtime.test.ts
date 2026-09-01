import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAdminCsrf,
  mintAdminCsrfSecret,
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
