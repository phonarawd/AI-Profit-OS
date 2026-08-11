/**
 * QA1 — schemas + Nest routes contract (정적 진실)
 * Schemathesis/OpenAPI 전면 도입 금지 · schemas/*.v1.json + Nest routes만
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT, readJson } = require("../lib/hash-scope.cjs");

/** @type {Array<{ id: string, schema: string, routesFile: string, routeNeedle: string, invariant_id?: string }>} */
const ENGINE_CONTRACTS = [
  {
    id: "CTR-HOME-MONEY-READ",
    schema: "schemas/home-money-read.v1.json",
    routesFile: "services/api-nest/src/wallet/home-money-read.user.routes.ts",
    routeNeedle: "me/home-money-read",
  },
  {
    id: "CTR-HOME-READ",
    schema: "schemas/home-read-model.v1.json",
    routesFile: "services/api-nest/src/home-read/home-read.user.routes.ts",
    routeNeedle: "me/home-read",
    invariant_id: "INV-LIFECYCLE-01",
  },
  {
    id: "CTR-PARTICIPATE",
    schema: "schemas/participate-request.v1.json",
    routesFile: "services/api-nest/src/opportunities/opportunities.user.routes.ts",
    routeNeedle: "opportunities/:id/participate",
    invariant_id: "INV-LIFECYCLE-01",
  },
  {
    id: "CTR-WALLET-BUCKETS",
    schema: "schemas/wallet-buckets.v1.json",
    routesFile: "services/api-nest/src/wallet/wallet.routes.ts",
    routeNeedle: "buckets",
    invariant_id: "INV-LEDGER-01",
  },
  {
    id: "CTR-LEDGER-JOURNAL",
    schema: "schemas/ledger-journal.v1.json",
    routesFile: "services/api-nest/src/ledger/ledger.routes.ts",
    routeNeedle: "journals",
    invariant_id: "INV-LEDGER-01",
  },
  {
    id: "CTR-TRADE-EXECUTION",
    schema: "schemas/trade-execution-state.v1.json",
    routesFile: "services/api-nest/src/trades/trades.user.routes.ts",
    routeNeedle: "execute-tick",
    invariant_id: "INV-LIFECYCLE-01",
  },
  {
    id: "CTR-OPPORTUNITY-CARD",
    schema: "schemas/opportunity-card.v1.json",
    routesFile: "services/api-nest/src/opportunities/opportunities.user.routes.ts",
    routeNeedle: "opportunities",
  },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function checkManifest() {
  const findings = [];
  const manifestRel = "schemas/manifest.day1.json";
  if (!exists(manifestRel)) {
    return {
      id: "CTR-MANIFEST",
      status: "FAIL",
      findings: [`missing ${manifestRel}`],
    };
  }
  let manifest;
  try {
    manifest = readJson(manifestRel);
  } catch (e) {
    return {
      id: "CTR-MANIFEST",
      status: "FAIL",
      findings: [`invalid JSON: ${e.message}`],
    };
  }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length < 1) findings.push("manifest.files empty");
  for (const f of files) {
    const rel = `schemas/${f}`;
    if (!exists(rel)) {
      findings.push(`manifest lists missing file: ${rel}`);
      continue;
    }
    try {
      const sch = readJson(rel);
      if (!sch || typeof sch !== "object") findings.push(`${rel} not an object`);
    } catch (e) {
      findings.push(`${rel} invalid JSON: ${e.message}`);
    }
  }
  return {
    id: "CTR-MANIFEST",
    status: findings.length ? "FAIL" : "PASS",
    findings,
    fileCount: files.length,
  };
}

function checkEngineContracts() {
  return ENGINE_CONTRACTS.map((c) => {
    const findings = [];
    if (!exists(c.schema)) findings.push(`missing schema ${c.schema}`);
    else {
      try {
        const sch = readJson(c.schema);
        if (!sch.$id && !sch.title && !sch.properties) {
          findings.push(`${c.schema} looks empty/non-schema`);
        }
      } catch (e) {
        findings.push(`${c.schema} invalid JSON: ${e.message}`);
      }
    }
    if (!exists(c.routesFile)) findings.push(`missing routes ${c.routesFile}`);
    else {
      const body = read(c.routesFile);
      if (!body.includes(c.routeNeedle)) {
        findings.push(`${c.routesFile} missing route needle "${c.routeNeedle}"`);
      }
    }
    return {
      id: c.id,
      schema: c.schema,
      routesFile: c.routesFile,
      routeNeedle: c.routeNeedle,
      invariant_id: c.invariant_id || null,
      status: findings.length ? "FAIL" : "PASS",
      findings,
    };
  });
}

function runSchemasRoutesContract() {
  const manifest = checkManifest();
  const contracts = checkEngineContracts();
  const all = [manifest, ...contracts];
  const failCount = all.filter((x) => x.status === "FAIL").length;
  return {
    check_id: "QA1_SCHEMAS_ROUTES_CONTRACT",
    status: failCount === 0 ? "PASS" : "FAIL",
    failCount,
    passCount: all.length - failCount,
    items: all,
  };
}

module.exports = { runSchemasRoutesContract, ENGINE_CONTRACTS };
