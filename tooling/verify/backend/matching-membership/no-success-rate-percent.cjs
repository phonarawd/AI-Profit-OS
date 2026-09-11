/**
 * BACKEND-ONLY PORT of tooling/verify/no-success-rate-percent.cjs (recovery base SHA 86f15964).
 * UI assertions (customer web / admin UI / shared UI package / client SDK) were recorded in
 * quality/putduk-web-ui-assertions-handoff.md and removed here; only backend
 * (services / schemas / supabase / workers / infra / governance) assertions remain.
 */
/**
 * verify:no-success-rate-percent — Engine §48.13.3 · UI §48.6
 * successRatePercent schema/API/Admin control = 0
 * Math.random → MATCH_SUCCESS = 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../../..");
const fails = [];

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");
}

// Schema: property must not exist (not: required is OK as forbid marker)
const policySchemaPath = path.join(root, "schemas/execution-policy.v1.json");
const policySchema = JSON.parse(fs.readFileSync(policySchemaPath, "utf8"));
if (policySchema.properties?.successRatePercent) {
  fails.push("schemas/execution-policy.v1.json defines successRatePercent");
}
if (!policySchema.not?.required?.includes("successRatePercent")) {
  fails.push("execution-policy.v1 must forbid successRatePercent via not.required");
}

const overrideSchema = JSON.parse(
  fs.readFileSync(
    path.join(root, "schemas/user-match-policy-override.v1.json"),
    "utf8",
  ),
);
if (overrideSchema.properties?.successRatePercent) {
  fails.push("user-match-policy-override must not define successRatePercent");
}

// Runtime paths: settlement + match-strictness + execution-policy service
const runtimeFiles = [
  "services/engine-rust/src/settlement_rule.rs",
  "services/engine-rust/settlement_rule.cjs",
  "services/market-intelligence/src/match-strictness.cjs",
  "services/api-nest/src/execution-policy/execution-policy.admin.service.ts",
  "services/api-nest/src/execution-policy/execution-policy.admin.controller.ts",
];

for (const rel of runtimeFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push(`missing ${rel}`);
    continue;
  }
  const code = stripComments(fs.readFileSync(abs, "utf8"));
  if (/Math\.random\s*\(/.test(code)) {
    fails.push(`${rel} contains Math.random`);
  }
  // Assignment / property definition of successRatePercent (mentions in strings OK if FORBIDDEN)
  if (
    /successRatePercent\s*[:=]\s*[0-9]/.test(code) ||
    /["']successRatePercent["']\s*:/.test(code)
  ) {
    // Allow only reject/forbid branches
    const lines = code.split("\n").filter((l) => /successRatePercent/.test(l));
    for (const line of lines) {
      if (
        /FORBIDDEN|forbid|reject|throw|not\.required|must not/i.test(line)
      ) {
        continue;
      }
      if (/successRatePercent/.test(line)) {
        fails.push(`${rel} non-forbid successRatePercent: ${line.trim()}`);
      }
    }
  }
}

// DDL: no success_rate column on execution_policies
const migDir = path.join(root, "supabase/migrations");
for (const name of fs.readdirSync(migDir)) {
  if (!name.endsWith(".sql")) continue;
  const sql = fs.readFileSync(path.join(migDir, name), "utf8");
  if (
    /execution_policies[\s\S]{0,400}success_rate/i.test(sql) ||
    /ADD COLUMN[^;]*success_rate_percent/i.test(sql)
  ) {
    fails.push(`migration ${name} must not add success_rate_percent`);
  }
}

if (fails.length) {
  console.error(
    "[verify:no-success-rate-percent] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}
console.log(
  "[verify:no-success-rate-percent] PASS (schema/API/runtime successRatePercent 0 · rng 0 · DDL 0)",
);
