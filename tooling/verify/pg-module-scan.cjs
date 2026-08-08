/** Payment gateway SDK import scan (PG사 0) — not PostgreSQL */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const deny =
  /from ['"][^'"]*(toss|portone|iamport|inicis|nicepay|paypal|@stripe\/stripe-js|stripe-checkout)/i;
const denyPkg =
  /["'](@tosspayments|portone|iamport|nicepay|paypal|@stripe\/stripe-js)["']/;

const roots = ["apps", "services", "packages", "workers"].map((d) =>
  path.join(root, d)
);

const hits = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist" || ent.name === ".next")
      continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx|json)$/.test(ent.name)) {
      const t = fs.readFileSync(p, "utf8");
      if (deny.test(t) || denyPkg.test(t)) hits.push(path.relative(root, p));
    }
  }
}

roots.forEach(walk);

if (hits.length) {
  console.error("[verify:pg-module-scan] FAIL payment-gateway imports:\n- " + hits.join("\n- "));
  process.exit(1);
}
console.log("[verify:pg-module-scan] PASS (no PG사 SDK)");
