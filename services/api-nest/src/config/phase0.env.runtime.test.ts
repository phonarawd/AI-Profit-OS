import assert from "node:assert/strict";
import { test } from "node:test";
import {
  USER_JWT_SECRET_MIN_BYTES,
  isUserJwtSecretStrong,
} from "./phase0.env.ts";

test("HS256 user JWT secret requires at least 32 UTF-8 bytes", () => {
  assert.equal(USER_JWT_SECRET_MIN_BYTES, 32);
  assert.equal(isUserJwtSecretStrong(null), false);
  assert.equal(isUserJwtSecretStrong(""), false);
  assert.equal(isUserJwtSecretStrong("a".repeat(31)), false);
  assert.equal(isUserJwtSecretStrong("a".repeat(32)), true);
});

test("JWT strength is measured in bytes, not JavaScript code units", () => {
  assert.equal(Buffer.byteLength("🔐".repeat(8), "utf8"), 32);
  assert.equal(isUserJwtSecretStrong("🔐".repeat(7)), false);
  assert.equal(isUserJwtSecretStrong("🔐".repeat(8)), true);
});
