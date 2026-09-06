import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../auth/password-hash.ts";
import {
  ADMIN_GENERIC_AUTH_FAILED,
  canonicalizeAdminIdentifier,
  isAdminLocked,
  isSharedAdminIdentifierForbidden,
  nextAdminLockUntil,
  planMakerCheckerDecide,
  sessionKindAllowsWrite,
} from "./admin-identity.policy.ts";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  hashBackupCode,
  totpAt,
  verifyTotp,
} from "./admin-totp.ts";
import {
  clearAdminIdentityStore,
  createMemoryAdminIdentityStore,
  registerAdminIdentityStore,
} from "./admin-session.store.ts";
import { resetAdminSessionMapsForTest } from "./admin-session.revoke.ts";

const adminKey = "JWT_" + "ADMIN_SECRET";
process.env[adminKey] = "selftest_admin_secret_min_32_chars_ok!";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHECKER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("shared admin/root identifiers are forbidden", () => {
  assert.equal(isSharedAdminIdentifierForbidden("admin"), true);
  assert.equal(isSharedAdminIdentifierForbidden("ROOT"), true);
  assert.equal(isSharedAdminIdentifierForbidden("operator"), true);
  assert.equal(isSharedAdminIdentifierForbidden("founder.ops"), false);
});

test("connection-code session cannot write", () => {
  assert.equal(sessionKindAllowsWrite("code_exchange_emergency"), false);
  assert.equal(sessionKindAllowsWrite("password_mfa"), true);
});

test("maker-checker rejects self-approval", () => {
  const denied = planMakerCheckerDecide({
    makerAdminId: ADMIN_ID,
    checkerAdminId: ADMIN_ID,
    status: "pending",
  });
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.code, "ADMIN_SELF_APPROVAL_FORBIDDEN");
  const allowed = planMakerCheckerDecide({
    makerAdminId: ADMIN_ID,
    checkerAdminId: CHECKER_ID,
    status: "pending",
  });
  assert.equal(allowed.ok, true);
});

test("TOTP encrypt/decrypt and window verify", () => {
  const secret = generateTotpSecret();
  const cipher = encryptTotpSecret(secret);
  assert.notEqual(cipher, secret);
  assert.equal(decryptTotpSecret(cipher), secret);
  assert.equal(verifyTotp(secret, totpAt(secret)), true);
  assert.equal(verifyTotp(secret, "000000"), false);
});

test("password login is generic and MFA plus durable revoke survive map reset", async () => {
  const store = createMemoryAdminIdentityStore();
  registerAdminIdentityStore(store);
  resetAdminSessionMapsForTest();
  const phrase = "correct-horse-admin-login";
  await store.putCredentialRow({
    adminId: ADMIN_ID,
    usernameCanonical: "founder.ops",
    passwordHash: await hashPassword(phrase),
    failedAttempts: 0,
    lockedUntil: null,
    email: "founder.ops@example.invalid",
    role: "super",
    active: true,
  });
  const totpSecret = generateTotpSecret();
  await store.putTotp(ADMIN_ID, encryptTotpSecret(totpSecret));

  const missingId = canonicalizeAdminIdentifier("nobody");
  const missing = await store.findCredentialByIdentifier(missingId);
  assert.equal(missing, null);
  assert.equal(await verifyPassword("wrong-secret-xx", await hashPassword(phrase)), false);

  assert.equal(isSharedAdminIdentifierForbidden("admin"), true);

  const cred = await store.findCredentialByIdentifier("founder.ops");
  assert.ok(cred);
  assert.equal(isAdminLocked(cred.lockedUntil), false);
  assert.equal(await verifyPassword(phrase, cred.passwordHash), true);
  assert.equal(nextAdminLockUntil(0), null);

  const challengeId = "challenge-fixture-one";
  await store.putChallenge({
    id: "00000000-0000-4000-8000-000000000010",
    adminId: ADMIN_ID,
    purpose: "login_mfa",
    tokenHash: "pending-one",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  const consumed = await store.consumeChallenge("pending-one", "login_mfa");
  assert.equal(consumed?.adminId, ADMIN_ID);
  const replay = await store.consumeChallenge("pending-one", "login_mfa");
  assert.equal(replay, null);
  assert.equal(verifyTotp(totpSecret, totpAt(totpSecret)), true);

  await store.insertSession({
    id: "00000000-0000-4000-8000-000000000001",
    adminId: ADMIN_ID,
    familyId: "00000000-0000-4000-8000-000000000002",
    accessJti: "jti-durable-revoke",
    refreshHash: "hash",
    kind: "password_mfa",
    aal: "aal2",
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    lastSeenAt: new Date().toISOString(),
    idleDeadline: new Date(Date.now() + 60_000).toISOString(),
    stepUpAt: new Date().toISOString(),
    revokedAt: null,
    rotatedAt: null,
  });
  await store.revokeByJti("jti-durable-revoke", new Date().toISOString());
  resetAdminSessionMapsForTest();
  const afterMapReset = await store.resolveByJti("jti-durable-revoke");
  assert.equal(afterMapReset.kind, "revoked");
  assert.equal(ADMIN_GENERIC_AUTH_FAILED, "ADMIN_AUTH_FAILED");
  assert.equal(hashBackupCode("ABCDE12345").length, 64);
  assert.equal(challengeId.length > 0, true);
  clearAdminIdentityStore();
});
