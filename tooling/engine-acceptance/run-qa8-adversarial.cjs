/**
 * QA8 booted-Nest HTTP adversarial runner.
 * Canonical qa8-result.v1.json 을 덮어쓰지 않는다.
 * HARNESS_VALIDATION 과 CURRENT_PRODUCT_SECURITY_VERDICT 를 분리한다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { assertKillSwitch, assertDbTarget, resolveHarnessDatabaseUrl } = require("./kill-switch.cjs");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  createEphemeralSecrets,
  buildIdentityMatrix,
  redactAuthorization,
  mintUserToken,
  SYNTH_ADMIN,
} = require("./lib/synthetic-identity.cjs");
const { inventoryAdminRoutes, coverageDrift } = require("./qa8/admin-route-inventory.cjs");
const { CASES, casesForInventoryCoverage } = require("./qa8/adversarial-cases.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");
const {
  provisionPrivacyTestUser,
  snapshotPrivacyUser,
  queryLedgerCreatedBy,
} = require("./harness/qa8-privacy-probe.cjs");

function outDir() {
  const d =
    process.env.AIPO_QA_HARNESS_OUT ||
    path.join(ROOT, "_tmp_qa_harness", "qa8-adversarial");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson(abs, obj) {
  fs.writeFileSync(abs, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function httpCall(baseUrl, method, pth, headers, body, timeoutMs = 12_000) {
  return new Promise((resolve) => {
    const u = new URL(pth, baseUrl);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        timeout: timeoutMs,
        headers: {
          ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {}),
          ...(headers || {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data, error: null }));
      },
    );
    req.on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, body: "", error: "timeout" });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function bodyClass(status, body) {
  const t = String(body || "");
  if (status === 0) return "transport_failure";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status >= 500) return "http_5xx";
  if (status >= 200 && status < 300) return "http_2xx";
  return "other";
}

function sanitizeExcerpt(body) {
  return String(body || "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[jwt-redacted]")
    .slice(0, 240);
}

function evaluateCase(c, response) {
  const cls = bodyClass(response.status, response.body);
  if (c.expected_current === "deferred_until_admin_guard") {
    return {
      assertion_result: "DEFERRED",
      product_failure: false,
      expected_current_product_failure: false,
    };
  }
  if (c.expected_current === "product_open_admin") {
    const open = response.status >= 200 && response.status < 300;
    return {
      assertion_result: open ? "FAIL" : "PASS",
      product_failure: open,
      expected_current_product_failure: open,
      canonical_defect: open ? c.canonical_defect || "QA8_ADMIN_BOUNDARY" : null,
    };
  }
  if (c.expected_current === "user_guarded") {
    const ok = response.status === 200 || response.status === 401 || response.status === 404;
    return {
      assertion_result: ok ? "PASS" : "FAIL",
      product_failure: !ok,
      expected_current_product_failure: false,
    };
  }
  if (c.expected_current === "admin_allow") {
    const ok = response.status >= 200 && response.status < 300;
    return {
      assertion_result: ok ? "PASS" : "FAIL",
      product_failure: !ok,
      expected_current_product_failure: false,
    };
  }
  if (c.expected_current === "admin_forbidden") {
    const ok = response.status === 403;
    return {
      assertion_result: ok ? "PASS" : "FAIL",
      product_failure: !ok,
      expected_current_product_failure: false,
    };
  }
  if (c.expect_after_repair && c.expect_after_repair.status) {
    const ok = response.status === c.expect_after_repair.status;
    return {
      assertion_result: ok ? "PASS" : "FAIL",
      product_failure: !ok,
      expected_current_product_failure: false,
    };
  }
  return {
    assertion_result: "OBSERVED",
    product_failure: false,
    expected_current_product_failure: false,
    body_class: cls,
  };
}

const ADMIN_API_PREFIX = require("./qa8/admin-route-inventory.cjs").API_PREFIX;
/** Mirrors services/api-nest/src/auth/auth.constants.ts DELETE_ACCOUNT_CONFIRM_PHRASE (harness fixture, not a secret). */
const DELETE_ACCOUNT_CONFIRM_PHRASE = "\ud0c8\ud1f4\ud558\uaca0\uc2b5\ub2c8\ub2e4";

/**
 * Admin operator spoofing (Mission 4) — a body-supplied adminId must never
 * reach the audit record. Real HTTP call against a real admin_balance_adjust
 * journal, then a real DB re-query of the value that was actually persisted.
 */
async function proveOperatorIdentityFromToken(baseUrl, matrix, databaseUrl) {
  const targetUserId = "33333333-3333-4333-8333-333333333333"; // SYNTH_USER_ORDINARY — untouched by other admin cases
  const spoofedAdminId = "deadbeef-dead-4eef-8eef-deadbeefdead";
  const idempotencyKey = `qa-synth-operator-proof-${Date.now()}`;
  const ident = matrix.admin_super;
  const response = await httpCall(
    baseUrl,
    "POST",
    `${ADMIN_API_PREFIX}/users/${targetUserId}/balance-adjust`,
    { authorization: ident.authorization },
    {
      bucket: "profit",
      kind: "credit",
      amountUsdt: "1",
      reason: "qa-synth-operator-identity-proof",
      idempotencyKey,
      // Spoofing attempt — the controller must never read these.
      adminId: spoofedAdminId,
      updatedByAdminId: spoofedAdminId,
      createdByAdminId: spoofedAdminId,
      operatorId: spoofedAdminId,
    },
  );
  const httpOk = response.status >= 200 && response.status < 300;
  let recordedCreatedBy = null;
  let dbError = null;
  if (httpOk) {
    try {
      recordedCreatedBy = await queryLedgerCreatedBy(databaseUrl, targetUserId);
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }
  const boundToToken = recordedCreatedBy === SYNTH_ADMIN;
  const spoofReachedAudit = recordedCreatedBy === spoofedAdminId;
  const verdict = httpOk && boundToToken && !spoofReachedAudit ? "PASS" : "FAIL";
  return {
    verdict,
    http_status: response.status,
    recorded_created_by_matches_token_sub: boundToToken,
    spoofed_admin_id_reached_audit: spoofReachedAudit,
    db_error: dbError,
    findings:
      verdict === "PASS"
        ? []
        : [
            `operator-identity proof FAIL: http_status=${response.status} recorded_created_by=${
              recordedCreatedBy ?? "(none)"
            } expected_token_sub=${SYNTH_ADMIN} spoofed_id=${spoofedAdminId}`,
          ],
  };
}

/**
 * Concurrent/interleave (Mission 4) — fire alternating GET /auth/session
 * calls for two different real users concurrently and confirm every response
 * is scoped to its OWN bearer token, never the other caller's.
 */
async function proveConcurrentInterleaveIsolation(baseUrl, matrix) {
  const pairs = [];
  for (let i = 0; i < 6; i++) {
    pairs.push({ who: "user_a", ident: matrix.user_a });
    pairs.push({ who: "user_b", ident: matrix.user_b });
  }
  const responses = await Promise.all(
    pairs.map((p) =>
      httpCall(baseUrl, "GET", "/api/v1/auth/session", { authorization: p.ident.authorization }, null).then(
        (r) => ({ ...p, response: r }),
      ),
    ),
  );
  const findings = [];
  for (const r of responses) {
    let parsed = null;
    try {
      parsed = JSON.parse(r.response.body);
    } catch {
      /* recorded as failure below */
    }
    const expectedUserId = r.ident.userId;
    const seenUserId = parsed && (parsed.userId || parsed.sub);
    if (r.response.status !== 200 || seenUserId !== expectedUserId) {
      findings.push(
        `interleave leak: who=${r.who} expected=${expectedUserId} saw=${seenUserId ?? "(none)"} status=${r.response.status}`,
      );
    }
  }
  return {
    verdict: findings.length ? "FAIL" : "PASS",
    request_count: responses.length,
    findings,
  };
}

/**
 * Privacy delete-account (Mission 4) — real HTTP delete against an isolated
 * Postgres, then direct row-level verification: purge-table row gone, a
 * RETAIN-classified table (kyc_status) untouched, tombstone fields null, and
 * a second synthetic account is completely unaffected. Also proves a
 * rejected (wrong confirm-phrase) attempt mutates nothing.
 */
async function provePrivacyDeleteAccount(baseUrl, secrets, databaseUrl) {
  const findings = [];
  const target = await provisionPrivacyTestUser(databaseUrl, {});
  const control = await provisionPrivacyTestUser(databaseUrl, {});
  const targetToken = mintUserToken(secrets.jwtUserSecret, target.userId);
  const controlToken = mintUserToken(secrets.jwtUserSecret, control.userId);

  const before = await snapshotPrivacyUser(databaseUrl, target.userId);

  // Negative case first: wrong confirm phrase must be rejected AND mutate nothing.
  const rejected = await httpCall(
    baseUrl,
    "POST",
    "/api/v1/auth/delete-account",
    { authorization: `Bearer ${controlToken}` },
    { confirmPhrase: "wrong-phrase", confirmAgain: true },
  );
  const controlAfterReject = await snapshotPrivacyUser(databaseUrl, control.userId);
  const rejectOk =
    rejected.status >= 400 &&
    rejected.status < 500 &&
    controlAfterReject.user &&
    controlAfterReject.user.status !== "deleted" &&
    controlAfterReject.notification_prefs_count === before.notification_prefs_count;
  if (!rejectOk) {
    findings.push(
      `invalid-confirm rejection proof FAIL: status=${rejected.status} control_status=${controlAfterReject.user && controlAfterReject.user.status}`,
    );
  }

  // Happy path: real delete against the target.
  const deleted = await httpCall(
    baseUrl,
    "POST",
    "/api/v1/auth/delete-account",
    { authorization: `Bearer ${targetToken}` },
    { confirmPhrase: DELETE_ACCOUNT_CONFIRM_PHRASE, confirmAgain: true },
  );
  const httpOk = deleted.status >= 200 && deleted.status < 300;
  if (!httpOk) {
    findings.push(`delete-account HTTP FAIL: status=${deleted.status} body=${sanitizeExcerpt(deleted.body)}`);
  }

  const after = await snapshotPrivacyUser(databaseUrl, target.userId);
  const controlAfterDelete = await snapshotPrivacyUser(databaseUrl, control.userId);

  const tombstoned =
    after.user &&
    after.user.status === "deleted" &&
    after.user.email == null &&
    after.user.phone_e164 == null &&
    after.user.password_hash == null;
  const purgeConfirmed = after.notification_prefs_count === 0;
  const retainConfirmed = after.kyc_status_count === 1;
  const sessionsPurged = after.auth_sessions_count === 0;
  const controlUnaffected =
    controlAfterDelete.user &&
    controlAfterDelete.user.status !== "deleted" &&
    controlAfterDelete.notification_prefs_count === 1 &&
    controlAfterDelete.kyc_status_count === 1;

  if (!tombstoned) findings.push(`tombstone proof FAIL: ${JSON.stringify(after.user)}`);
  if (!purgeConfirmed) {
    findings.push(`purge-table proof FAIL: notification_prefs_count=${after.notification_prefs_count}`);
  }
  if (!retainConfirmed) findings.push(`retain-table proof FAIL: kyc_status_count=${after.kyc_status_count}`);
  if (!sessionsPurged) findings.push(`session-purge proof FAIL: auth_sessions_count=${after.auth_sessions_count}`);
  if (!controlUnaffected) {
    findings.push(`control-user isolation proof FAIL: ${JSON.stringify(controlAfterDelete)}`);
  }

  const verdict =
    httpOk && rejectOk && tombstoned && purgeConfirmed && retainConfirmed && controlUnaffected ? "PASS" : "FAIL";

  return {
    verdict,
    target_user_tombstoned: Boolean(tombstoned),
    purge_table_confirmed: Boolean(purgeConfirmed),
    retain_table_confirmed: Boolean(retainConfirmed),
    sessions_purged: Boolean(sessionsPurged),
    control_user_unaffected: Boolean(controlUnaffected),
    invalid_confirm_rejected_no_mutation: Boolean(rejectOk),
    http_status: deleted.status,
    findings,
  };
}

async function runQa8Adversarial(opts = {}) {
  assertKillSwitch(opts);
  const inventory = inventoryAdminRoutes();
  const drift = coverageDrift(inventory, casesForInventoryCoverage());
  const secrets = createEphemeralSecrets();
  const matrix = buildIdentityMatrix(secrets);
  const skipBoot = opts.skipBoot === true || process.env.AIPO_QA8_SKIP_BOOT === "1";
  const port = Number(opts.port || process.env.PORT || 4000);
  const baseUrl = opts.productBaseUrl || `http://127.0.0.1:${port}`;
  const databaseUrl = opts.databaseUrl || resolveHarnessDatabaseUrl();
  let started = null;
  let pgPrep = null;

  if (!skipBoot) {
    if (!databaseUrl) {
      const err = new Error("DATABASE_URL required for QA8 adversarial");
      err.code = "AIPO_QA_HARNESS_FAILURE";
      throw err;
    }
    assertDbTarget({ databaseUrl, target_env: opts.target_env });
    pgPrep = await prepareIsolatedPostgres({ databaseUrl, target_env: opts.target_env });
    nest.assertDistPresent();
    started = nest.startNest({
      port,
      secrets,
      env: {
        DATABASE_URL: databaseUrl,
        LLM_PROVIDER: "none",
        JWT_USER_SECRET: secrets.jwtUserSecret,
        JWT_ADMIN_SECRET: secrets.jwtAdminSecret,
      },
    });
    await nest.waitForHealth({ port });
  }

  const rows = [];
  let harnessTransportFails = 0;
  let productFails = 0;
  let expectedP0 = 0;

  const extraCases = [];
  const seenControllers = new Set();
  for (const r of inventory.routes) {
    if (r.method !== "GET") continue;
    if (seenControllers.has(r.controller)) continue;
    seenControllers.add(r.controller);
    extraCases.push({
      id: `ADV-INVENTORY-NO-TOKEN:${r.controller}`,
      method: "GET",
      path: r.path,
      identity: "none",
      surface: "admin",
      expect_after_repair: { status: 401 },
      expected_current: "product_open_admin",
      canonical_defect: "QA8_ADMIN_BOUNDARY",
      assertion: "inventory-derived unauthenticated GET",
    });
  }

  for (const c of [...CASES, ...extraCases]) {
    if (c.expected_current === "deferred_until_admin_guard") {
      rows.push({
        id: c.id,
        route: c.path,
        method: c.method,
        identity_class: c.identity,
        status_code: null,
        body_class: "deferred",
        assertion_result: "DEFERRED",
        provenance: "not_executed_until_admin_guard",
        expected_current_product_failure: false,
      });
      continue;
    }
    const ident = matrix[c.identity] || matrix.none;
    const headers = {};
    if (ident && ident.authorization) headers.authorization = ident.authorization;
    const skipBody = c.destructive && c.skip_body_on_open;
    const response = await httpCall(
      baseUrl,
      c.method,
      c.path,
      headers,
      skipBody ? null : c.body,
    );
    if (response.status === 0) harnessTransportFails += 1;
    const ev = evaluateCase(c, response);
    if (ev.product_failure) productFails += 1;
    if (ev.expected_current_product_failure) expectedP0 += 1;
    rows.push({
      id: c.id,
      route: c.path,
      method: c.method,
      identity_class: c.identity,
      status_code: response.status,
      body_class: bodyClass(response.status, response.body),
      body_excerpt: sanitizeExcerpt(response.body),
      assertion_result: ev.assertion_result,
      expected_current_product_failure: ev.expected_current_product_failure || false,
      canonical_defect: ev.canonical_defect || null,
      provenance: "http_against_booted_nest",
      timestamp: new Date().toISOString(),
      auth_redacted: redactAuthorization(ident && ident.authorization),
    });
  }

  // Mission-4 dynamic proofs beyond the static CASES matrix — only when a
  // real Nest+Postgres is actually up (skip-boot mode has neither).
  let operatorIdentityProof = null;
  let concurrentIsolationProof = null;
  let privacyDelete = null;
  if (!skipBoot) {
    operatorIdentityProof = await proveOperatorIdentityFromToken(baseUrl, matrix, databaseUrl);
    concurrentIsolationProof = await proveConcurrentInterleaveIsolation(baseUrl, matrix);
    privacyDelete = await provePrivacyDeleteAccount(baseUrl, secrets, databaseUrl);
  }
  const extraProofs = [operatorIdentityProof, concurrentIsolationProof, privacyDelete].filter(Boolean);
  const extraProofFails = extraProofs.filter((p) => p.verdict !== "PASS");

  const unknownProductFails = productFails - expectedP0 + extraProofFails.length;
  let harness_status = "PASS";
  if (harnessTransportFails > 0 && rows.every((r) => r.status_code === 0 || r.assertion_result === "DEFERRED")) {
    harness_status = "HARNESS_FAILURE";
  } else if (harnessTransportFails === rows.filter((r) => r.assertion_result !== "DEFERRED").length) {
    harness_status = "HARNESS_FAILURE";
  }

  const adminOpen = rows.some(
    (r) => r.canonical_defect === "QA8_ADMIN_BOUNDARY" && r.expected_current_product_failure,
  );

  const result = {
    schema: "harness.qa8-adversarial.v1",
    suite_id: "QA8_ADVERSARIAL",
    measuredAt: new Date().toISOString(),
    harness_status,
    product_security_verdict: adminOpen || extraProofFails.length > 0 ? "FAIL" : "PASS",
    expected_current_product_failure: adminOpen ? "QA8_ADMIN_BOUNDARY" : null,
    unknown_product_failures: Math.max(0, unknownProductFails),
    verdict_class: harness_status === "HARNESS_FAILURE" ? "HARNESS_FAILURE" : "HARNESS_VALIDATION",
    does_not_replace_qa8_result: true,
    non_canonical: true,
    inventory: {
      controller_count: inventory.controller_count,
      route_count: inventory.route_count,
      controllers: inventory.controllers,
      drift: drift.drift,
      controllers_without_case: drift.controllers_without_case,
    },
    cases: rows,
    operator_identity_proof: operatorIdentityProof,
    concurrent_isolation_proof: concurrentIsolationProof,
    privacy_delete: privacyDelete,
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    secrets: { committed: false },
    notes: [
      "CURRENT_PRODUCT_SECURITY_VERDICT is independent of harness_status.",
      "Admin boundary CASES now expect AdminGuard to be active (product_open_admin == violation).",
      "operator_identity_proof / concurrent_isolation_proof / privacy_delete are Mission-4 dynamic proofs " +
        "against the SAME booted Nest + isolated Postgres — any FAIL here is a genuinely new, unclassified " +
        "product defect (not laundered, not silently retried).",
    ],
  };

  const dir = outDir();
  writeJson(path.join(dir, "qa8-adversarial.v1.json"), result);
  writeJson(path.join(dir, "admin-route-inventory.v1.json"), inventory);
  if (started) nest.stopNest({ pid: started.pid, workDir: started.paths.dir });

  if (harness_status === "HARNESS_FAILURE") {
    const err = new Error("QA8 adversarial harness failure");
    err.code = "AIPO_QA_HARNESS_FAILURE";
    throw err;
  }
  if (result.unknown_product_failures > 0) {
    const err = new Error("QA8 unknown product failures (not the known AdminBoundary P0)");
    err.code = "AIPO_QA_UNKNOWN_PRODUCT_FAILURE";
    throw err;
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  runQa8Adversarial({
    target_env: get("--target-env") || process.env.AIPO_QA_TARGET_ENV || "ci",
    hostname: get("--hostname") || process.env.AIPO_QA_HOSTNAME || "localhost",
    synthetic_account_namespace:
      get("--synthetic-ns") || process.env.AIPO_QA_SYNTHETIC_NS || "qa-synth-ci",
    databaseUrl: get("--database-url") || resolveHarnessDatabaseUrl(),
    skipBoot: args.includes("--skip-boot"),
  })
    .then((out) => {
      console.log(
        `[run-qa8-adversarial] harness=${out.harness_status} product=${out.product_security_verdict} expected=${out.expected_current_product_failure} ` +
          `operator_identity=${out.operator_identity_proof && out.operator_identity_proof.verdict} ` +
          `concurrent_isolation=${out.concurrent_isolation_proof && out.concurrent_isolation_proof.verdict} ` +
          `privacy_delete=${out.privacy_delete && out.privacy_delete.verdict}`,
      );
    })
    .catch((e) => {
      try {
        writeJson(path.join(outDir(), "harness-failure.v1.json"), {
          code: e.code || "FAIL",
          message: e.message,
        });
      } catch {
        /* upload path still needs a file when wait fails early */
      }
      console.error(`[run-qa8-adversarial] ${e.code || "FAIL"} — ${e.message}`);
      process.exit(
        e.code === "AIPO_QA_KILL_SWITCH" || e.code === "AIPO_QA_HARNESS_FAILURE" ? 2 : 1,
      );
    });
}

if (require.main === module) {
  main();
}

module.exports = { runQa8Adversarial };
