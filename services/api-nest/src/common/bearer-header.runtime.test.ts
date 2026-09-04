import assert from "node:assert/strict";
import { test } from "node:test";
import { BEARER_HEADER_MAX, extractBearerToken } from "./bearer-header.ts";

test("extractBearerToken accepts Bearer and extra spaces linearly", () => {
  assert.equal(extractBearerToken("Bearer abc"), "abc");
  assert.equal(extractBearerToken("bearer abc"), "abc");
  assert.equal(extractBearerToken("  BEARER   tok  "), "tok");
  assert.equal(extractBearerToken("Basic abc"), null);
  assert.equal(extractBearerToken(""), null);
  assert.equal(extractBearerToken("Bearer"), null);
  assert.equal(extractBearerToken("Bearer   "), null);
  assert.equal(extractBearerToken(["Bearer xyz"]), "xyz");
});

test("extractBearerToken rejects oversize and adversarial spaces quickly", () => {
  const oversize = `Bearer ${"a".repeat(BEARER_HEADER_MAX)}`;
  assert.equal(extractBearerToken(oversize), null);
  const started = Date.now();
  const hostile = `Bearer${" ".repeat(4000)}`;
  assert.equal(extractBearerToken(hostile), null);
  assert.ok(Date.now() - started <= 20, "linear bearer scan must stay bounded");
});
