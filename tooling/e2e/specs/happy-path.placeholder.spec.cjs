/**
 * QA-LAB-BOOTSTRAP happy path placeholder.
 * 브라우저 money mutation 없음. REL-500이 확장한다.
 */
const { test, expect } = require("@playwright/test");
const {
  assertQaIsolation,
} = require("../lib/qa-env-isolation-guard.cjs");
const { createAuthSession } = require("../helpers/auth-session.cjs");

test.beforeAll(() => {
  assertQaIsolation({ purpose: "e2e" });
});

test("committed happy-path placeholder builds an isolated session helper", () => {
  const session = createAuthSession({ personaId: "qa-lab-persona-001" });
  expect(session.personaId).toBe("qa-lab-persona-001");
  expect(session.cookieName).toBe("aipo_session");
  expect(session.source).toBe("committed-helper");
});
