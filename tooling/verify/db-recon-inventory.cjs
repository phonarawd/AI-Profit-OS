"use strict";

/**
 * verify:db-recon-inventory — B0~B2 provenance inventory lock
 * Production apply / history repair / DDL 는 이 스크립트가 실행하지 않는다.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const PROD = "mgsytcetsiecllmhcyox";

const B0 = "governance/db-recon/b0-recon-matrix.v1.json";
const B1 = "governance/release-inventory/b1-push-rls-design.v1.json";
const B2 = "governance/release-inventory/b2-ownership-design.v1.json";

const NO_HISTORY_VERSIONS = [
  "20260819210000",
  "20260819220000",
  "20260820013000",
  "20260821090000",
  "20260823160000",
  "20260823170000",
  "20260823180000",
  "20260823190000",
  "20260823200000",
  "20260823210000",
];

function readJson(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push("missing: " + rel);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    fails.push("parse " + rel + ": " + err.message);
    return null;
  }
}

const b0 = readJson(B0);
const b1 = readJson(B1);
const b2 = readJson(B2);

if (b0) {
  if (b0.schema !== "governance.db-recon.b0-matrix.v1") {
    fails.push("b0 schema lock");
  }
  if (b0.project_ref !== PROD) fails.push("b0 project_ref lock");
  if (b0.apply !== 0) fails.push("b0.apply must be 0");
  if (b0.reapply !== 0) fails.push("b0.reapply must be 0");
  if (b0.history_rewrite !== 0) fails.push("b0.history_rewrite must be 0");
  if (b0.dashboard_ddl !== 0) fails.push("b0.dashboard_ddl must be 0");
  if (!Array.isArray(b0.rows) || b0.rows.length < 1) {
    fails.push("b0.rows required");
  } else {
    for (const row of b0.rows) {
      if (row.apply !== "FORBIDDEN") {
        fails.push("b0 row apply not FORBIDDEN: " + (row.version || "?"));
      }
    }
    for (const ver of NO_HISTORY_VERSIONS) {
      const row = b0.rows.find((r) => String(r.version) === ver);
      if (!row) fails.push("b0 missing no-history version " + ver);
      else if (row.apply !== "FORBIDDEN") {
        fails.push("no-history version must stay FORBIDDEN: " + ver);
      }
    }
  }
}

if (b1) {
  if (b1.apply !== 0) fails.push("b1.apply must be 0");
  if (!b1.design || b1.design.prod_apply !== "Founder + B-3 only") {
    fails.push("b1.design.prod_apply lock");
  }
  if (b1.design && b1.design.enable_only !== "FORBIDDEN") {
    fails.push("b1 enable_only must be FORBIDDEN");
  }
}

if (b2) {
  if (b2.apply !== 0) fails.push("b2.apply must be 0");
  if (!b2.design || b2.design.prod_apply !== "Founder + B-3") {
    fails.push("b2.design.prod_apply lock");
  }
  if (b2.design && b2.design.policies === "ENABLE-only forbidden") {
    /* expected phrase variant */
  } else if (b2.design && /ENABLE-only forbidden/i.test(String(b2.design.policies))) {
    /* ok */
  } else if (b2.design && String(b2.design.policies || "").includes("ENABLE-only forbidden")) {
    /* ok */
  } else {
    fails.push("b2 policies must forbid ENABLE-only");
  }
}

if (fails.length) {
  console.error("[verify:db-recon-inventory] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:db-recon-inventory] PASS");
console.log("  production_apply=0 history_rewrite=0 dashboard_ddl=0");
console.log("  no_history_versions_locked=" + NO_HISTORY_VERSIONS.length);
process.exit(0);
