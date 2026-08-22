/**
 * verify:rel-409-admin-r6 — certification honesty, not a weakened PASS
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const cert = read("governance/admin/R6_CERTIFICATION.md");
const routes = read("apps/admin/routes.ts");
const master = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");

for (const href of [
  "/admin",
  "/admin/opportunities",
  "/admin/execution-policy",
  "/admin/adapters",
  "/admin/wallet",
  "/admin/ledger",
  "/admin/users",
  "/admin/risk",
  "/admin/compliance",
  "/admin/system-control",
  "/admin/ai-logs",
  "/admin/growth",
  "/admin/audit",
]) {
  if (!routes.includes(`"${href}"`)) fails.push(`IA missing ${href}`);
  if (!cert.includes(href)) fails.push(`cert missing ${href}`);
}

if (!cert.includes("12모듈") && !cert.includes("12 modules")) {
  fails.push("cert must cover 12 modules");
}
if (!cert.includes("2b")) fails.push("cert must cover 2b");

const requiredDeps = [
  "rel-200",
  "rel-201",
  "rel-202",
  "rel-203",
  "rel-204",
  "rel-205",
  "rel-206",
  "rel-207",
  "rel-208",
  "rel-209",
  "rel-210",
  "rel-211",
  "rel-212",
  "rel-213",
  "rel-214",
  "rel-215",
  "rel-216",
  "rel-217",
  "rel-218",
  "rel-219",
  "rel-220",
  "rel-221",
  "rel-222",
  "rel-223",
  "rel-224",
  "rel-400",
  "rel-405",
  "rel-406",
  "rel-407",
  "rel-408",
];
const pendingDeps = requiredDeps.filter((id) => {
  const block = master.match(
    new RegExp(`- id: ${id}\\s*\\r?\\n\\s*content:[\\s\\S]*?\\r?\\n\\s*status: (\\w+)`),
  );
  return !block || block[1] !== "completed";
});

if (pendingDeps.length) {
  if (/STATUS:\s*PASS/.test(cert) || /R6_CERT = PASS/.test(cert)) {
    fails.push(
      `must not issue R6 PASS while dependency REL YAML is pending: ${pendingDeps.join(",")}`,
    );
  }
  if (!cert.includes("BLOCKED")) {
    fails.push("incomplete deps must keep certification BLOCKED");
  }
} else if (!/R6_CERT = PASS/.test(cert) || !/STATUS:\s*PASS/.test(cert)) {
  fails.push("all YAML deps completed — certification must be issued PASS");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rel-409-admin-r6")) {
  fails.push("package.json missing verify:rel-409-admin-r6");
}
if (!catalog.includes("rel-409-admin-r6")) {
  fails.push("CATALOG.md missing rel-409-admin-r6");
}

if (fails.length) {
  console.error("[verify:rel-409-admin-r6] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-409-admin-r6] PASS");
