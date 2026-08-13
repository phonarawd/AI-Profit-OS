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
} = require("./lib/synthetic-identity.cjs");
const { inventoryAdminRoutes, coverageDrift } = require("./qa8/admin-route-inventory.cjs");
const { CASES, casesForInventoryCoverage } = require("./qa8/adversarial-cases.cjs");
const { prepareIsolatedPostgres } = require("./harness/ci-postgres.cjs");
const nest = require("./harness/ci-nest-boot.cjs");

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

  const unknownProductFails = productFails - expectedP0;
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
    product_security_verdict: adminOpen ? "FAIL" : "PASS",
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
    postgres: pgPrep ? { classification: pgPrep.classification, host: pgPrep.host } : { skipped: skipBoot },
    secrets: { committed: false },
    notes: [
      "CURRENT_PRODUCT_SECURITY_VERDICT is independent of harness_status.",
      "AdminGuard is not implemented yet — open admin is EXPECTED_CURRENT_PRODUCT_FAILURE.",
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
        `[run-qa8-adversarial] harness=${out.harness_status} product=${out.product_security_verdict} expected=${out.expected_current_product_failure}`,
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
