/**
 * verify:rel-507-production-e2e
 * stub money loop을 PASS로 인용하면 FAIL. 미실행은 NOT_RUN으로 남긴다.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const specRel = "tooling/e2e/specs/production-loop.spec.cjs";
const docRel = "governance/release-master/REL-507-PRODUCTION-E2E.md";
if (!fs.existsSync(path.join(root, specRel))) fails.push(`missing: ${specRel}`);
if (!fs.existsSync(path.join(root, docRel))) fails.push(`missing: ${docRel}`);

const spec = read(specRel);
const doc = read(docRel);
if (!spec.includes("assertQaIsolation")) {
  fails.push("production-loop spec must use QA_ENV_ISOLATION_GUARD");
}
if (spec.includes("stubMoneyLoop(")) {
  fails.push("production-loop spec must not call stubMoneyLoop");
}
if (!/STATUS:\s*NOT_RUN/.test(doc)) {
  fails.push("REL-507 evidence must stay NOT_RUN until a real isolated loop runs");
}
if (/ACCEPTANCE:\s*YES/.test(doc) || /E2E PASS/.test(doc)) {
  fails.push("do not claim REL-507 PASS without a real browser loop");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:rel-507-production-e2e"')) {
  fails.push("package.json missing verify:rel-507-production-e2e");
}

if (fails.length) {
  console.error("[verify:rel-507-production-e2e] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:rel-507-production-e2e] PASS (honest NOT_RUN · stub loop not cited · guard kept)",
);
