const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..", "..");
const fails = [];
const SKIP = new Set(["node_modules", ".git", ".next", "dist", "target", ".wrangler", "coverage", "playwright-report"]);
function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
["packages", "apps"].forEach((d) => {
  walk(path.join(root, d), (p) => {
    if (path.extname(p) !== ".css") return;
    const css = fs.readFileSync(p, "utf8");
    if (/prefers-color-scheme/.test(css)) {
      fails.push(path.relative(root, p).replace(/\\/g, "/") + ": prefers-color-scheme forbidden");
    }
  });
});
if (fails.length) {
  console.error("[verify:dark-leak-guard] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:dark-leak-guard] PASS (prefers-color-scheme 0)");
