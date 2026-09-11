/**
 * QA-LAB-BOOTSTRAP happy path (node:test port of the former Playwright placeholder spec).
 * No browser · no money mutation. The isolation guard and the committed auth-session helper
 * must compose into an isolated persona session.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { assertQaIsolation } = require("../lib/qa-env-isolation-guard.cjs");
const { createAuthSession } = require("./auth-session.cjs");

test("qa isolation guard accepts the e2e purpose", () => {
  assert.doesNotThrow(() => assertQaIsolation({ purpose: "e2e" }));
});

test("committed happy-path builds an isolated session helper", () => {
  const session = createAuthSession({ personaId: "qa-lab-persona-001" });
  assert.equal(session.personaId, "qa-lab-persona-001");
  assert.equal(session.cookieName, "aipo_session");
  assert.equal(session.source, "committed-helper");
});

test("auth session helper refuses an empty persona", () => {
  assert.throws(() => createAuthSession({ personaId: "" }), /personaId required/);
});
