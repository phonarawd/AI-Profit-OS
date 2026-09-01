import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPublicHealthSanitized,
  publicHealthBody,
} from "./health.public.ts";

describe("public health sanitization", () => {
  it("keeps provenance and configured/ok only", () => {
    const body = publicHealthBody({
      gitSha: "deadbeef",
      gitShaSource: "RENDER_GIT_COMMIT",
      dbConfigured: true,
      dbOk: true,
      redisConfigured: true,
      redisOk: false,
      regionUnsupported: true,
    });
    assert.equal(body.ok, true);
    assert.equal(body.service, "api-nest");
    assert.equal(body.gitSha, "deadbeef");
    assert.equal(body.gitShaSource, "RENDER_GIT_COMMIT");
    assert.deepEqual(body.db, { configured: true, ok: true });
    assert.deepEqual(body.redis, { configured: true, ok: false });
    assert.deepEqual(body.warnings, [{ code: "SUPABASE_REGION_UNSUPPORTED" }]);
    assert.deepEqual(assertPublicHealthSanitized(body), []);
  });

  it("rejects payloads that leak internals or raw errors", () => {
    const leaks = assertPublicHealthSanitized({
      ok: true,
      hosts: { app: "app.example", api: "api.example" },
      bus: { kind: "in-process" },
      r2KycBucket: "kyc-secret",
      db: { provider: "supabase-or-compose", region: "ap-northeast-2", detail: "ECONNREFUSED" },
    });
    assert.ok(leaks.includes("hosts"));
    assert.ok(leaks.includes("bus"));
    assert.ok(leaks.includes("r2KycBucket"));
    assert.ok(leaks.includes("provider"));
    assert.ok(leaks.includes("ECONNREFUSED"));
  });
});
