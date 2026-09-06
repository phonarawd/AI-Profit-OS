import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  assertAdminCsrf,
  mintAdminCsrfSecret,
  mintAdminCsrfToken,
  planAdminLogout,
  requestHasQueryBearer,
  verifyAdminCsrfToken,
} from "./admin-session.csrf.ts";
import {
  consumeAdminCodeExchange,
  isAdminAccessTokenRevoked,
  isAdminCodeExchangeConsumed,
  resetAdminSessionMapsForTest,
  revokeAdminAccessToken,
} from "./admin-session.revoke.ts";
import {
  isAdminCodeExchangeEnabled,
  planAdminCodeExchange,
} from "./admin-code-exchange.ts";
import {
  clearAdminRbacLookup,
  registerAdminRbacLookup,
  resolveAdminRbac,
} from "./admin-rbac.lookup.ts";

function sessionToken(label: string): string {
  return `${label}.${"s".repeat(64)}`;
}

test("query-string bearer is rejected", () => {
  assert.equal(requestHasQueryBearer("/admin?access_token=x"), true);
  assert.equal(requestHasQueryBearer("/admin?token=x"), true);
  assert.equal(requestHasQueryBearer("/admin?bearer=x"), true);
  assert.equal(requestHasQueryBearer("/admin?tab=review"), false);
});

test("signed csrf must match cookie/header and the HttpOnly session", () => {
  const session = sessionToken("csrf-match");
  const csrf = mintAdminCsrfToken(session);
  assert.match(csrf, /^v1\.[0-9a-f]{64}\.[A-Za-z0-9_-]{43}$/);
  assert.equal(verifyAdminCsrfToken(csrf, session), true);
  assertAdminCsrf({
    cookies: {
      [ADMIN_SESSION_COOKIE_NAME]: session,
      [ADMIN_CSRF_COOKIE_NAME]: csrf,
    },
    headers: { "x-admin-csrf": csrf },
  });

  const other = sessionToken("csrf-other");
  const otherCsrf = mintAdminCsrfToken(other);
  assert.throws(
    () =>
      assertAdminCsrf({
        cookies: {
          [ADMIN_SESSION_COOKIE_NAME]: session,
          [ADMIN_CSRF_COOKIE_NAME]: csrf,
        },
        headers: { "x-admin-csrf": otherCsrf },
      }),
    /ADMIN_CSRF_INVALID/,
  );
  assert.throws(
    () =>
      assertAdminCsrf({
        cookies: {
          [ADMIN_SESSION_COOKIE_NAME]: other,
          [ADMIN_CSRF_COOKIE_NAME]: csrf,
        },
        headers: { "x-admin-csrf": csrf },
      }),
    /ADMIN_CSRF_INVALID/,
  );
  assert.throws(
    () => assertAdminCsrf({ cookies: {}, headers: {} }),
    /ADMIN_CSRF_INVALID/,
  );
});

test("raw csrf nonce cannot authorize a session-bound mutation", () => {
  const session = sessionToken("csrf-raw");
  const raw = mintAdminCsrfSecret();
  assert.equal(raw.length, 64);
  assert.equal(verifyAdminCsrfToken(raw, session), false);
  assert.throws(
    () =>
      assertAdminCsrf({
        cookies: {
          [ADMIN_SESSION_COOKIE_NAME]: session,
          [ADMIN_CSRF_COOKIE_NAME]: raw,
        },
        headers: { "x-admin-csrf": raw },
      }),
    /ADMIN_CSRF_INVALID/,
  );
});

test("logout revoke blocks the same token hash", () => {
  const token = "admin-access-token-fixture";
  assert.equal(isAdminAccessTokenRevoked(token), false);
  revokeAdminAccessToken(token, Date.now() + 60_000);
  assert.equal(isAdminAccessTokenRevoked(token), true);
});

test("logout with admin session cookie and no CSRF is fail-closed", () => {
  const token = sessionToken(`logout-no-csrf-${Date.now()}`);
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

test("logout with matching signed CSRF plans revoke and clear", () => {
  const token = sessionToken(`logout-csrf-ok-${Date.now()}`);
  const csrf = mintAdminCsrfToken(token);
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
  const token = sessionToken(`logout-revoke-${Date.now()}`);
  const csrf = mintAdminCsrfToken(token);
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

test("signed double-submit CSRF cookie stays readable but is session-bound", () => {
  const src = fs.readFileSync(
    path.join(import.meta.dirname, "admin-session.cookies.ts"),
    "utf8",
  );
  assert.match(src, /httpOnly:\s*true/);
  assert.match(src, /httpOnly:\s*false/);
  assert.match(src, /sameSite:\s*"strict"/);
  assert.match(src, /더블서브밋/);
  assert.match(src, /mintAdminCsrfToken\(accessToken\)/);

  const session = sessionToken("admin-access-token-fixture");
  const csrf = mintAdminCsrfToken(session);
  assert.notEqual(session, csrf);
  assert.ok(csrf.length >= 32);
  assert.equal(verifyAdminCsrfToken(csrf, session), true);
  assert.equal(verifyAdminCsrfToken(csrf, sessionToken("different")), false);
  assertAdminCsrf({
    cookies: {
      [ADMIN_SESSION_COOKIE_NAME]: session,
      [ADMIN_CSRF_COOKIE_NAME]: csrf,
    },
    headers: { "x-admin-csrf": csrf },
  });
});

test("connection-code exchange is off by default", () => {
  assert.equal(isAdminCodeExchangeEnabled({}), false);
  assert.equal(isAdminCodeExchangeEnabled({ AIPO_ADMIN_CODE_EXCHANGE_ENABLED: "true" }), true);
  const disabled = planAdminCodeExchange({
    enabled: false,
    token: "jwt",
    revoked: false,
  });
  assert.equal(disabled.ok, false);
  if (!disabled.ok) assert.equal(disabled.code, "ADMIN_CODE_EXCHANGE_DISABLED");
});

test("same admin JWT cannot be exchanged twice on this process", () => {
  resetAdminSessionMapsForTest();
  const token = sessionToken("exchange-once");
  const first = planAdminCodeExchange({
    enabled: true,
    token,
    revoked: isAdminCodeExchangeConsumed(token),
  });
  assert.equal(first.ok, true);
  consumeAdminCodeExchange(token, Date.now() + 60_000);
  const second = planAdminCodeExchange({
    enabled: true,
    token,
    revoked:
      isAdminAccessTokenRevoked(token) || isAdminCodeExchangeConsumed(token),
  });
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, "ADMIN_AUTH_INVALID");
});

test("in-memory revoke disappears after process map reset", () => {
  resetAdminSessionMapsForTest();
  const token = sessionToken("restart-gap");
  revokeAdminAccessToken(token, Date.now() + 60_000);
  assert.equal(isAdminAccessTokenRevoked(token), true);
  resetAdminSessionMapsForTest();
  assert.equal(isAdminAccessTokenRevoked(token), false);
});

test("inactive admin_rbac row denies a valid signed identity", async () => {
  registerAdminRbacLookup(async () => ({
    status: "row",
    row: { role: "super", active: false },
  }));
  const inactive = await resolveAdminRbac("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(inactive.kind, "inactive");
  registerAdminRbacLookup(async () => ({ status: "empty" }));
  const missing = await resolveAdminRbac("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(missing.kind, "missing");
  clearAdminRbacLookup();
  const unwired = await resolveAdminRbac("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(unwired.kind, "unwired");
});

test("active admin_rbac role replaces the token role", async () => {
  registerAdminRbacLookup(async () => ({
    status: "row",
    row: { role: "cs", active: true },
  }));
  const active = await resolveAdminRbac("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(active.kind, "active");
  if (active.kind === "active") assert.equal(active.role, "cs");
  clearAdminRbacLookup();
});
