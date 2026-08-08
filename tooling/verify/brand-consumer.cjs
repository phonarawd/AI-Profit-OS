/** Consumer brand = 퍼뜩; ban retired names on user surfaces */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const CONSUMER = "퍼뜩";
const AI_NAME = "퍼뜩";
const RETIRED = ["오늘수익", "바로번다"];

const manifest = path.join(root, "packages/ui/brand/brand.manifest.json");
if (!fs.existsSync(manifest)) {
  console.error("[verify:brand-consumer] FAIL missing brand.manifest.json");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(manifest, "utf8"));
if (j.consumer?.name !== CONSUMER || j.consumer?.short_name !== CONSUMER) {
  console.error(`[verify:brand-consumer] FAIL consumer.name/short_name must be ${CONSUMER}`);
  process.exit(1);
}
if (j.ai?.name !== AI_NAME) {
  console.error(`[verify:brand-consumer] FAIL ai.name must be ${AI_NAME}`);
  process.exit(1);
}
const retired = j.consumer?.retired_names || [];
for (const r of RETIRED) {
  if (!retired.includes(r)) {
    console.error(`[verify:brand-consumer] FAIL retired_names must include ${r}`);
    process.exit(1);
  }
}

const scanDirs = ["apps/web", "packages/ui/copy"].map((d) => path.join(root, d));
const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|json|md)$/.test(ent.name)) {
      const t = fs.readFileSync(p, "utf8");
      for (const r of RETIRED) {
        if (t.includes(r)) hits.push(`${path.relative(root, p)} (::${r})`);
      }
    }
  }
}
scanDirs.forEach(walk);

if (hits.length) {
  console.error("[verify:brand-consumer] FAIL retired consumer name:\n- " + hits.join("\n- "));
  process.exit(1);
}
console.log(`[verify:brand-consumer] PASS (${CONSUMER})`);
