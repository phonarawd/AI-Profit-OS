/**
 * verify:benefit-no-credits-currency — UI §5.9.5 B0 · Money §51.8a B0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const copy = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/benefits.ts"),
  "utf8",
);
if (/credits_balance|creditsBalance|virtualCredits/i.test(copy)) {
  fails.push("benefits copy must not define Credits balance");
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".next"].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, onFile);
    else onFile(p);
  }
}

walk(path.join(root, "supabase/migrations"), (file) => {
  if (!file.endsWith(".sql")) return;
  const t = fs.readFileSync(file, "utf8");
  if (/CREATE TABLE.*credits/i.test(t)) {
    fails.push(`forbidden credits table: ${path.relative(root, file)}`);
  }
});

if (fails.length) {
  console.error("[verify:benefit-no-credits-currency] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:benefit-no-credits-currency] PASS");
