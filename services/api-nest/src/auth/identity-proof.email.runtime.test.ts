import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_MAX_LEN, isValidEmail } from "./identity-proof.email";

test("accepts the same valid shapes the old regex allowed", () => {
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("user+tag@ex.co.kr"), true);
  assert.equal(isValidEmail("a@b.c"), true);
});

test("rejects the same invalid shapes the old regex rejected", () => {
  assert.equal(isValidEmail("@example.com"), false);
  assert.equal(isValidEmail("user@"), false);
  assert.equal(isValidEmail("user@example"), false);
  assert.equal(isValidEmail("user@example."), false);
  assert.equal(isValidEmail("user@.com"), false);
  assert.equal(isValidEmail("user@ex@ample.com"), false);
  assert.equal(isValidEmail("user example@x.com"), false);
  assert.equal(isValidEmail("user@exam ple.com"), false);
});

test("rejects oversize input without weakening valid short emails", () => {
  const oversize = `a@b.${"c".repeat(EMAIL_MAX_LEN)}`;
  assert.ok(oversize.length > EMAIL_MAX_LEN);
  assert.equal(isValidEmail(oversize), false);
  assert.equal(isValidEmail("user@example.com"), true);
});

test("adversarial long dotted input stays linear and is rejected", () => {
  const adversarial = `user@${"a.".repeat(10_000)}a`;
  const t0 = Date.now();
  const ok = isValidEmail(adversarial);
  const ms = Date.now() - t0;
  assert.equal(ok, false);
  assert.ok(ms <= 20, `expected <=20ms, got ${ms}`);
});
