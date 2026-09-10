import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORBIDDEN_USER_AUTH_FIELDS,
  parseProfileGender,
} from "./auth.constants.ts";

describe("profile gender contract", () => {
  it("accepts only male|female and omits missing", () => {
    assert.deepEqual(parseProfileGender(undefined), { ok: true });
    assert.deepEqual(parseProfileGender("male"), { ok: true, value: "male" });
    assert.deepEqual(parseProfileGender("female"), { ok: true, value: "female" });
    assert.equal(parseProfileGender("").ok, false);
    assert.equal(parseProfileGender("unknown").ok, false);
    assert.equal(parseProfileGender("Male").ok, false);
  });

  it("keeps gender in the Stage A forbidden list", () => {
    assert.ok((FORBIDDEN_USER_AUTH_FIELDS as readonly string[]).includes("gender"));
  });
});
