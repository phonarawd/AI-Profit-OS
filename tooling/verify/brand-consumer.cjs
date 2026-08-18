/** Consumer brand = 퍼뜩. Manifest stores current name only. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const CONSUMER = "퍼뜩";
const FORBIDDEN_LEGACY = ["오늘수익", "바로번다"];

const manifest = path.join(root, "packages/ui/brand/brand.manifest.json");
if (!fs.existsSync(manifest)) {
  console.error("[verify:brand-consumer] FAIL missing brand.manifest.json");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(manifest, "utf8"));
if (j.consumer?.name !== CONSUMER || j.consumer?.short_name !== CONSUMER) {
  console.error("[verify:brand-consumer] FAIL consumer.name/short_name must be 퍼뜩");
  process.exit(1);
}
if (j.ai?.name && j.ai.name !== CONSUMER) {
  console.error("[verify:brand-consumer] FAIL ai.name must be 퍼뜩 if present");
  process.exit(1);
}
if (j.consumer?.retired_names) {
  console.error("[verify:brand-consumer] FAIL retired_names must not exist in Active manifest");
  process.exit(1);
}

const hits = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue;
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp);
    else if (/\.(ts|tsx|js|jsx|json|md)$/.test(ent.name)) {
      const t = fs.readFileSync(fp, "utf8");
      for (const r of FORBIDDEN_LEGACY) {
        if (t.includes(r)) hits.push(`${path.relative(root, fp)} (::${r})`);
      }
    }
  }
}
["apps/web", "packages/ui/copy"].forEach((d) => walk(path.join(root, d)));
if (hits.length) {
  console.error("[verify:brand-consumer] FAIL legacy consumer name:\n- " + hits.join("\n- "));
  process.exit(1);
}
console.log("[verify:brand-consumer] PASS (" + CONSUMER + ")");
