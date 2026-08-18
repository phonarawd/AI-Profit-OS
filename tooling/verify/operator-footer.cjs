/**
 * verify:operator-footer — UI §50.9 · §6.4c.1 D · Infra §31.7
 * PART2c-pre scaffold: schema supportEmail(required+format email) ↔ instance 일치
 * PART2c: LandingOperatorFooter ↔ legal/SiteFooter 3면 · JSX 하드코딩 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const EXPECTED_EMAIL = "support@hiptk.app";

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    fails.push(`${rel} invalid JSON`);
    return null;
  }
}

const schema = readJson("schemas/operator-entity.v1.json");
const instance = readJson("schemas/operator-entity.instance.json");

if (schema) {
  const required = schema.required || [];
  if (!required.includes("supportEmail")) {
    fails.push("operator-entity.v1.json required[] must include supportEmail");
  }
  const prop = schema.properties?.supportEmail;
  if (!prop) {
    fails.push("operator-entity.v1.json missing properties.supportEmail");
  } else {
    if (prop.type !== "string") {
      fails.push("supportEmail.type must be string");
    }
    if (prop.format !== "email") {
      fails.push("supportEmail.format must be email");
    }
  }
  const example = schema.examples?.[0];
  if (!example || example.supportEmail !== EXPECTED_EMAIL) {
    fails.push(
      `schema.examples[0].supportEmail must be ${EXPECTED_EMAIL}`,
    );
  }
}

if (instance) {
  if (instance.supportEmail !== EXPECTED_EMAIL) {
    fails.push(
      `instance.supportEmail must be ${EXPECTED_EMAIL} (got ${instance.supportEmail})`,
    );
  }
  if (schema?.examples?.[0]?.supportEmail && instance.supportEmail) {
    if (schema.examples[0].supportEmail !== instance.supportEmail) {
      fails.push("schema.examples supportEmail must match instance");
    }
  }
  for (const k of ["legalName", "licenseNumber", "jurisdiction", "supportEmail"]) {
    if (instance[k] == null || instance[k] === "") {
      fails.push(`instance missing ${k}`);
    }
  }
}

// LandingOperatorFooter (PART2c Owns) — absent OK for 2c-pre scaffold; present → 3-surface lock
const footerRel =
  "packages/ui/components/shell/LandingOperatorFooter.tsx";
const footerPath = path.join(root, footerRel);
const footerSrc = fs.existsSync(footerPath)
  ? fs.readFileSync(footerPath, "utf8")
  : null;
if (footerSrc) {
  if (!footerSrc.includes("operator-entity.instance.json")) {
    fails.push(
      "LandingOperatorFooter must import schemas/operator-entity.instance.json (JSX 하드코딩 0)",
    );
  }
  for (const needle of [
    "legalName",
    "licenseNumber",
    "supportEmail",
    "jurisdiction",
    "/me/legal",
    "mailto:",
  ]) {
    if (!footerSrc.includes(needle)) {
      fails.push(`LandingOperatorFooter missing ${needle}`);
    }
  }
  // hardcoded email string in JSX = defect (must come from instance)
  if (/support@[a-z0-9.-]+/i.test(footerSrc)) {
    fails.push(
      "LandingOperatorFooter must not hardcode supportEmail (use instance)",
    );
  }
  if (instance) {
    const legal = read("packages/ui/copy/ko/legal.ts") || "";
    const op = read("packages/ui/copy/ko/operator.ts") || "";
    const site = read("packages/ui/components/shell/SiteFooter.tsx") || "";
    for (const [label, src] of [
      ["legal.ts", legal],
      ["operator.ts", op],
    ]) {
      if (!src.includes(instance.legalName)) {
        fails.push(`${label} must include instance.legalName`);
      }
      if (!src.includes(instance.licenseNumber)) {
        fails.push(`${label} must include instance.licenseNumber`);
      }
    }
    if (site && !site.includes("T.operator.footer") && !site.includes("T.legal.operator")) {
      fails.push("SiteFooter must bind T.operator / T.legal.operator (drift 0)");
    }
  }
}

if (fails.length) {
  console.error("[verify:operator-footer] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  footerSrc
    ? "[verify:operator-footer] PASS (schema↔instance supportEmail · LandingOperatorFooter · legal 3면)"
    : "[verify:operator-footer] PASS (scaffold · supportEmail required+format · instance 일치 · footer=PART2c)",
);
