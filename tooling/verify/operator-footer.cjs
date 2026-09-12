/**
 * verify:operator-footer — §50.9 · Infra §31.7
 * operator-entity schema supportEmail(required+format email) <-> instance (server-side operator SSOT)
 * (footer/legal copy binding lives in putduk-web)
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

// LandingOperatorFooter / SiteFooter / legal.ts / operator.ts (instance binding · JSX hardcoding 0): putduk-web (handoff 1d)

if (fails.length) {
  console.error("[verify:operator-footer] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:operator-footer] PASS (operator-entity schema/instance · supportEmail required+format · instance fields)",
);
