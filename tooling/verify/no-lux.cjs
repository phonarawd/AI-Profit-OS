/**
 * verify:no-lux
 * Detects legacy LUX design runtime. Does not require remaining = 0 in UI-1.
 * Fail closed on: detector/selftest break, allowlist without reason,
 * uninventoried reintroduction, foundation alias/copy, luxury_bag misclass.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  scan,
  loadInventory,
  inventoryKeys,
  uniqueFiles,
  foundationCopiesLegacy,
} = require("./lib/no-lux-detector.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

if (!process.env.NO_LUX_INNER) {
  const self = spawnSync(
    process.execPath,
    [path.join(__dirname, "selftest-no-lux.cjs")],
    { cwd: root, encoding: "utf8", env: { ...process.env, NO_LUX_INNER: "1" } },
  );
  if (self.status !== 0) {
    console.error(self.stdout || "");
    console.error(self.stderr || "");
    console.error("[verify:no-lux] FAIL selftest");
    process.exit(1);
  }
}

function mustJson(rel, required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  for (const key of required) {
    if (!(key in json)) fails.push(`${rel} missing ${key}`);
  }
  return json;
}

mustJson("schemas/spark-toss-tokens.v1.json", ["$id", "required"]);
mustJson("schemas/spark-toss-visual-authority.v1.json", ["$id", "required"]);
mustJson("schemas/legacy-design-runtime-inventory.v1.json", ["$id", "required"]);

const tokensPath = path.join(root, "packages/ui/tokens/spark-toss-tokens.ts");
const tokensSrc = fs.existsSync(tokensPath)
  ? fs.readFileSync(tokensPath, "utf8")
  : "";
for (const key of [
  "canvas",
  "elevatedSurface",
  "textPrimary",
  "brandPrimary",
  "brandAccent",
  "borderSubtle",
  "focusRing",
  "display",
  "pageTitle",
  "touchTargetPx",
  "reducedMotion",
]) {
  if (!tokensSrc.includes(key)) fails.push(`spark-toss-tokens missing ${key}`);
}

const authority = mustJson("governance/visual-authority/spark-toss-visual-authority.v1.json", [
  "schema",
  "figma",
  "approvedNodes",
  "authorityStatus",
  "luxuryBagPreservation",
]);
if (authority) {
  if (authority.figma.fileKey !== "w7Yg8j2x9evuheOSSLqFw5") {
    fails.push("authority fileKey drift");
  }
  if (authority.authorityStatus.visualPass === true) {
    fails.push("VISUAL_PASS must stay false until founder-approved frames exist");
  }
  if (authority.authorityStatus.sparkTossDesignSystem === "FOUNDER_APPROVED_LOCKED") {
    fails.push("must not promote unverified design system");
  }
  if (authority.approvedNodes.length !== 2) {
    fails.push("approvedNodes must stay Account Hub Desktop+Mobile only");
  }
}

const forward = scan(root, { reverse: false });
const reverse = scan(root, { reverse: true });
if (forward.allow.errors.length) fails.push(...forward.allow.errors);

const fwdKeys = inventoryKeys(forward.runtimeRows);
const revKeys = inventoryKeys(reverse.runtimeRows);
if (fwdKeys.join("\n") !== revKeys.join("\n")) {
  fails.push("forward/reverse scan mismatch");
}

const inv = loadInventory(root);
if (inv.missing) {
  fails.push("inventory missing");
} else {
  const json = inv.json;
  if (json.zeroLuxComplete === true && json.rows.some((r) => r.productionRuntime)) {
    fails.push("ZERO_LUX_COMPLETE claimed while runtime rows remain");
  }
  if (json.goal !== "LEGACY_LUX_DESIGN_RUNTIME_PATHS = 0") {
    fails.push("inventory goal drift");
  }
  const known = new Set(json.rows.map((r) => `${r.file}::${r.classification}`));
  for (const row of forward.runtimeRows) {
    const key = `${row.file}::${row.classification}`;
    if (!known.has(key)) {
      fails.push(`uninventoried runtime ${key}`);
    }
  }
}

fails.push(...foundationCopiesLegacy(root));

const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "packages/ui/package.json"), "utf8"),
);
if (!pkg.exports["./tokens/spark-toss"]) {
  fails.push("packages/ui must export ./tokens/spark-toss");
}
if (!pkg.exports["./tokens/spark-toss-theme.css"]) {
  fails.push("packages/ui must export ./tokens/spark-toss-theme.css");
}

if (fails.length) {
  console.error("[verify:no-lux] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const files = uniqueFiles(forward.runtimeRows);
console.log(
  [
    "[verify:no-lux] PASS",
    `runtimeRows=${forward.runtimeRows.length}`,
    `runtimeFiles=${files.length}`,
    `homeResidual=${forward.homeRows.length}`,
    `accountHubResidual=${forward.accountHubRows.length}`,
    `accountHubLock=${forward.accountHubLockRows.length}`,
    "zeroLuxComplete=NO",
    "visualPass=NO",
  ].join(" "),
);
