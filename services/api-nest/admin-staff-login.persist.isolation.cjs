"use strict";

const assert = require("node:assert/strict");
const persist = require("./admin-staff-login.persist.cjs");
const core = require("./admin-staff-login.core.cjs");

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECRET = "a".repeat(32);

async function check(name, fn, fails) {
  try {
    await fn();
    console.log("  PASS " + name);
  } catch (e) {
    fails.push(name + ": " + e.message);
    console.error("  FAIL " + name + ": " + e.message);
  }
}

async function main() {
  const fails = [];

  await check("unready_schema", async () => {
    const db = persist.createFakeStaffPersistDb({ schemaReady: false });
    const store = await persist.createPersistStaffStore(db);
    assert.equal(store.ready, false);
    const out = await core.loginStaff(
      { email: "ops@example.com", password: "any" },
      { store, verifyPassword: async () => true, adminJwtSecret: SECRET },
    );
    assert.equal(out.code, "STORE_UNREADY");
    assert.equal(out.applied, false);
  }, fails);

  await check("lookup_no_demo_seed", async () => {
    const db = persist.createFakeStaffPersistDb({ schemaReady: true, rows: [] });
    const store = await persist.createPersistStaffStore(db);
    assert.equal(store.ready, true);
    const found = await store.findByEmail("ops@example.com");
    assert.equal(found, null);
    const out = await core.loginStaff(
      { email: "ops@example.com", password: "any" },
      { store, verifyPassword: async () => false, adminJwtSecret: SECRET },
    );
    assert.equal(out.code, "ADMIN_AUTH_INVALID");
    assert.equal(out.httpStatus, 401);
  }, fails);

  await check("persist_row_password", async () => {
    const db = persist.createFakeStaffPersistDb({
      schemaReady: true,
      rows: [
        {
          email: "ops@example.com",
          adminId: ADMIN_ID,
          role: "super",
          passwordHash: "hash-ops",
          status: "active",
        },
      ],
    });
    const store = await persist.createPersistStaffStore(db);
    const bad = await core.loginStaff(
      { email: "ops@example.com", password: "wrong" },
      {
        store,
        verifyPassword: async (plain, encoded) => plain === "ok" && encoded === "hash-ops",
        adminJwtSecret: SECRET,
      },
    );
    assert.equal(bad.code, "ADMIN_AUTH_INVALID");
    const ok = await core.loginStaff(
      { email: "ops@example.com", password: "ok" },
      {
        store,
        verifyPassword: async (plain, encoded) => plain === "ok" && encoded === "hash-ops",
        adminJwtSecret: SECRET,
      },
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.adminId, ADMIN_ID);
  }, fails);

  await check("runtime_unset_not_fake", async () => {
    const store = await persist.resolveRuntimeStaffStore({});
    assert.equal(store.ready, false);
    assert.equal(store.kind, "persist_unready");
    let fakeThrown = false;
    try {
      await persist.resolveRuntimeStaffStore({}, { useFake: true });
    } catch (e) {
      fakeThrown = e && e.code === "FAKE_PERSIST_FORBIDDEN_IN_RUNTIME";
    }
    assert.equal(fakeThrown, true);
    let memThrown = false;
    try {
      await persist.resolveRuntimeStaffStore({}, { useMemory: true });
    } catch (e) {
      memThrown = e && e.code === "TEST_PROVIDER_FORBIDDEN_IN_RUNTIME";
    }
    assert.equal(memThrown, true);
  }, fails);

  await check("draft_not_in_supabase_migrations", async () => {
    assert.equal(persist.draftSqlPath().includes("quality/migrations-draft"), true);
    assert.equal(persist.draftSqlPath().includes("supabase/migrations"), false);
  }, fails);

  console.log("[admin-staff-login.persist.isolation] scope=fake_persist nest_inject=unready real_pg=BLOCKED");
  if (fails.length) {
    console.error("[admin-staff-login.persist.isolation] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[admin-staff-login.persist.isolation] PASS");
}

main();
