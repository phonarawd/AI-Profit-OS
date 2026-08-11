/**
 * verify:mockup-governance — ADR-013 · photo mockup 0 · Canon authority
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

// Banned photo mockup reintroduction (images / docs/mockups only — not rule filenames)
const bannedImageRe = /(mockup|metal-hex).*\.(png|jpe?g|webp|gif)$/i;
const bannedNameRe = /^ai-profit-os-.*\.(png|jpe?g)$/i;
const allowUnder = path.join(root, "packages", "ui", "brand", "assets");
walk(root, (p) => {
  const rel = path.relative(root, p).replace(/\\/g, "/");
  if (
    rel.startsWith(".git") ||
    rel.includes("node_modules") ||
    rel.startsWith(".cursor/") ||
    rel.startsWith("tooling/")
  ) {
    return;
  }
  if (p.startsWith(allowUnder)) return;
  const base = path.basename(p);
  if (
    bannedImageRe.test(base) ||
    bannedNameRe.test(base) ||
    rel.startsWith("docs/mockups/") ||
    rel.startsWith("assets/") && /\.(png|jpe?g)$/i.test(base)
  ) {
    fails.push(`banned mockup path: ${rel}`);
  }
});

const rule = path.join(root, ".cursor/rules/mockup-governance.mdc");
if (!fs.existsSync(rule)) {
  fails.push("missing .cursor/rules/mockup-governance.mdc");
} else {
  const ruleSrc = fs.readFileSync(rule, "utf8");
  if (!ruleSrc.includes("Visual Contract")) {
    fails.push("mockup-governance.mdc must document the Visual Contract layer");
  }
  if (!/APPROVED VISUAL MASTER/i.test(ruleSrc)) {
    fails.push("mockup-governance.mdc must document the Approved Visual Master exception");
  }
}

const intakeRule = path.join(root, ".cursor/rules/visual-master-intake.mdc");
if (!fs.existsSync(intakeRule)) {
  fails.push("missing .cursor/rules/visual-master-intake.mdc");
}

const visualLocks = path.join(root, "packages/ui/canon/visual-locks.v1.json");
if (!fs.existsSync(visualLocks)) {
  fails.push("missing packages/ui/canon/visual-locks.v1.json");
} else {
  try {
    const parsed = JSON.parse(fs.readFileSync(visualLocks, "utf8"));
    if (!Array.isArray(parsed.locks)) {
      fails.push("visual-locks.v1.json must declare a locks[] array");
    }
  } catch (e) {
    fails.push(`visual-locks.v1.json invalid JSON: ${e.message}`);
  }
}

const canonMan = path.join(root, "packages/ui/canon/manifest.json");
if (!fs.existsSync(canonMan)) {
  fails.push("missing canon/manifest.json");
} else {
  const m = JSON.parse(fs.readFileSync(canonMan, "utf8"));
  if (!m.rules?.photoMockups || !String(m.rules.photoMockups).includes("REMOVED")) {
    fails.push("canon manifest.rules.photoMockups must state REMOVED");
  }
  if (!m.tokenRef || !m.brandRef) {
    fails.push("canon manifest must declare tokenRef + brandRef");
  }
}

const adminWire = path.join(
  root,
  "packages/ui/canon/surfaces/admin-execution-policy.wire.json"
);
if (!fs.existsSync(adminWire)) {
  fails.push("missing admin-execution-policy.wire.json");
} else {
  const w = JSON.parse(fs.readFileSync(adminWire, "utf8"));
  if (w.owns !== "Admin") fails.push("admin-execution-policy.owns must be Admin");
  if (w.appsWebImplement !== false) {
    fails.push("admin-execution-policy.appsWebImplement must be false");
  }
}

// apps/web must not implement admin execution-policy page
const webAdmin = path.join(root, "apps/web/app/admin");
if (fs.existsSync(webAdmin)) {
  fails.push("apps/web/app/admin must not exist (Admin Owns)");
}

if (fails.length) {
  console.error("[verify:mockup-governance] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:mockup-governance] PASS (ADR-013 · photo0 · Admin owns wire)");
