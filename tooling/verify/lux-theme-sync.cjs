/**
 * verify:lux-theme-sync — lux-fintech.ts ↔ lux-theme.css token mirror (ADR-015 · ADR-017)
 * Shipping theme = peotteok-light (parse only export const luxFintech block).
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const tsFull = fs.readFileSync(
  path.join(root, "packages/ui/tokens/lux-fintech.ts"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(root, "packages/ui/tokens/lux-theme.css"),
  "utf8"
);

const shippingMatch = tsFull.match(
  /export const luxFintech = \{[\s\S]*?\n\} as const;/
);
if (!shippingMatch) {
  fails.push("export const luxFintech = { ... } as const; not found");
}
const ts = shippingMatch ? shippingMatch[0] : "";

if (!ts.includes('mode: "peotteok-light"')) {
  fails.push('lux-fintech.theme.mode must be "peotteok-light" (ADR-017 shipping)');
}
if (!tsFull.includes("luxFintechLegacyDark") && !tsFull.includes("luxDarkArchive")) {
  fails.push("lux-dark archive export missing (legacy keep · dual theme 0)");
}

const colorPairs = [
  ["bg", "lux-bg"],
  ["surface", "lux-surface"],
  ["elevated", "lux-elevated"],
  ["border", "lux-border"],
  ["text", "lux-text"],
  ["textMuted", "lux-text-muted"],
  ["accent", "lux-accent"],
  ["accentMuted", "lux-accent-muted"],
  ["danger", "lux-danger"],
  ["warning", "lux-warning"],
  ["profit", "lux-profit"],
  ["principal", "lux-principal"],
];

for (const [tsKey, cssToken] of colorPairs) {
  const fromTs = ts.match(new RegExp(`${tsKey}:\\s*"([#0-9A-Fa-f]+)"`));
  const fromCss = css.match(
    new RegExp(`--color-${cssToken}:\\s*(#[0-9a-f]+)`, "i")
  );
  if (!fromTs || !fromCss) {
    fails.push(`missing pair ${tsKey} ↔ --color-${cssToken}`);
    continue;
  }
  if (fromTs[1].toLowerCase() !== fromCss[1].toLowerCase()) {
    fails.push(
      `${tsKey}: ts=${fromTs[1]} css=${fromCss[1]} (must match lux-fintech.ts SSOT)`
    );
  }
}

const radiusPairs = [
  ["sm", "lux-sm"],
  ["md", "lux-md"],
  ["lg", "lux-lg"],
];

for (const [tsKey, cssToken] of radiusPairs) {
  const fromTs = ts.match(new RegExp(`${tsKey}:\\s*"([0-9]+px)"`));
  const fromCss = css.match(new RegExp(`--radius-${cssToken}:\\s*([0-9]+px)`));
  if (!fromTs || !fromCss) {
    fails.push(`missing radius ${tsKey} ↔ --radius-${cssToken}`);
    continue;
  }
  if (fromTs[1] !== fromCss[1]) {
    fails.push(`${tsKey}: ts=${fromTs[1]} css=${fromCss[1]}`);
  }
}

if (!css.includes("pretendardvariable-dynamic-subset.min.css")) {
  fails.push("lux-theme.css must load Pretendard (dynamic subset CDN)");
}

if (fails.length) {
  console.error("[verify:lux-theme-sync] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:lux-theme-sync] PASS (peotteok-light · lux-fintech ↔ lux-theme · Pretendard)"
);
