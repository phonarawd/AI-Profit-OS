"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  loadForbiddenHosts,
  resolveNonProdApiHost,
  requireNonProdApiIsolation,
} = require("./non-prod-api-host.cjs");

const root = path.resolve(__dirname, "../../..");
const forbidden = loadForbiddenHosts(root);

test("manifest denies production API hosts", () => {
  assert.equal(forbidden.has("api.hiptk.app"), true);
  assert.equal(forbidden.has("ai-profit-os.onrender.com"), true);
  assert.equal(forbidden.has("app.hiptk.app"), true);
});

test("missing STAGING_API_HOST fails closed", () => {
  const result = resolveNonProdApiHost({ API_HOST: "https://api.hiptk.app" }, forbidden);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "missing_staging_api_host");
});

test("production hostname is rejected even as STAGING_API_HOST", () => {
  for (const host of ["api.hiptk.app", "https://api.hiptk.app", "ai-profit-os.onrender.com"]) {
    const result = resolveNonProdApiHost({ STAGING_API_HOST: host }, forbidden);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "production_host");
  }
});

test("invalid URL fails closed", () => {
  const result = resolveNonProdApiHost({ STAGING_API_HOST: "://bad" }, forbidden);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid_url");
});

test("non-production host is accepted and normalized", () => {
  const result = resolveNonProdApiHost(
    { STAGING_API_HOST: "staging-api.example.test" },
    forbidden,
  );
  assert.equal(result.ok, true);
  assert.equal(result.host, "staging-api.example.test");
  assert.equal(result.href, "https://staging-api.example.test");
});

test("production target skips isolation", () => {
  const result = requireNonProdApiIsolation("production", {
    root,
    env: {},
  });
  assert.equal(result.skipped, true);
});

test("preview target does not inherit production API_HOST", () => {
  const env = { API_HOST: "https://api.hiptk.app" };
  let exited = false;
  const originalExit = process.exit;
  process.exit = () => {
    exited = true;
    throw new Error("exit");
  };
  try {
    requireNonProdApiIsolation("preview", { root, env });
    assert.fail("should fail closed");
  } catch (err) {
    assert.equal(exited, true);
    assert.equal(String(err.message), "exit");
  } finally {
    process.exit = originalExit;
  }
});
