const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const fails = [];
const ts = fs.readFileSync(path.join(root, "packages/ui/tokens/putduk.ts"), "utf8");
const css = fs.readFileSync(path.join(root, "packages/ui/tokens/putduk-theme.css"), "utf8");
const colors = fs.readFileSync(path.join(root, "packages/ui/foundation/colors.css"), "utf8");
if (!ts.includes("putdukTokens")) fails.push("putdukTokens export missing");
if (!css.includes("--color-pd-accent")) fails.push("theme accent missing");
if (!colors.includes("--pd-brand-accent")) fails.push("foundation accent missing");
const hex = (ts.match(/accent:\s*"(#[0-9A-Fa-f]+)"/) || [])[1];
if (!hex) fails.push("ts accent hex missing");
if (hex && !colors.toLowerCase().includes(hex.toLowerCase())) fails.push("foundation accent != putduk.ts");
if (fails.length) {
  console.error("[verify:putduk-theme-sync] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:putduk-theme-sync] PASS");
