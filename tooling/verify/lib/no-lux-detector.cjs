/**
 * Legacy LUX design-runtime detector.
 * Goal is LEGACY_LUX_DESIGN_RUNTIME_PATHS = 0, not the string "LUX" = 0.
 * luxury_bag is a product domain and must never be classified as design runtime.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "target",
  ".wrangler",
  "coverage",
  "playwright-report",
  "_tmp",
]);

const SCAN_ROOTS = ["apps/web", "apps/admin", "packages/ui"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".mjs", ".cjs"]);

const HOME_PREFIXES = [
  "apps/web/app/page.tsx",
  "apps/web/app/HomeDesktopClient.tsx",
  "apps/web/app/HomePageClient.tsx",
  "apps/web/app/globals.css",
  "apps/web/components/spark-dash-home/",
  "packages/ui/components/home/",
];

const ACCOUNT_HUB_LOCK = [
  "apps/web/app/me/AccountHub.tsx",
  "apps/web/app/me/account-hub.module.css",
  "apps/web/app/me/account-hub-assets.ts",
  "apps/web/app/me/page.tsx",
  "apps/web/app/me/ProfileClient.tsx",
  "apps/web/app/me/layout.tsx",
];

const ACCOUNT_HUB_RESIDUAL_PREFIXES = [
  "apps/web/app/me/account.module.css",
  "apps/web/app/me/legal/",
  "apps/web/app/me/guide/",
];

const LUX_HEX = [
  "#f6f4fc",
  "#6b3cff",
  "#8b6cff",
  "#14121f",
  "#6b6680",
  "#2b1b6b",
  "#5b3cff",
  "#e4e0f0",
  "#12b76a",
  "#f04438",
  "#f79009",
  "#090a10",
  "#12141c",
  "#1a1d28",
  "#3ddc97",
];

const DOMAIN_KEEP_RE =
  /luxury_bag|luxury-bag|luxuryBag|luxuryBagSeeds|assertLuxuryBag|assetIconForCategory\(\s*["']luxury_bag["']/;

function posix(rel) {
  return rel.split(path.sep).join("/");
}

function isHome(rel) {
  return HOME_PREFIXES.some((p) => rel === p || rel.startsWith(p));
}

function isAccountHubLock(rel) {
  return ACCOUNT_HUB_LOCK.includes(rel);
}

function isAccountHubResidual(rel) {
  return (
    isAccountHubLock(rel) ||
    ACCOUNT_HUB_RESIDUAL_PREFIXES.some((p) => rel === p || rel.startsWith(p))
  );
}

function surfaceOf(rel) {
  if (isHome(rel)) return "home";
  if (isAccountHubLock(rel)) return "account-hub-lock";
  if (rel.startsWith("apps/web/app/me/")) return "account-me";
  if (rel.startsWith("apps/admin/")) return "admin";
  if (rel.startsWith("packages/ui/components/lux/")) return "legacy-lux-components";
  if (rel.startsWith("packages/ui/tokens/")) return "tokens";
  if (rel.startsWith("packages/ui/")) return "shared-ui";
  if (rel.startsWith("apps/web/")) return "consumer";
  return "other";
}

function walk(absDir, root, out) {
  if (!fs.existsSync(absDir)) return;
  for (const ent of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) walk(abs, root, out);
    else out.push(posix(path.relative(root, abs)));
  }
}

function loadAllowlist(root) {
  const rel = "governance/design-system/no-lux-allowlist.v1.json";
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    return { file: rel, entries: [], errors: ["allowlist missing"] };
  }
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  const errors = [];
  const entries = [];
  for (const item of json.entries || []) {
    if (!item.path || !item.reason) {
      errors.push("allowlist entry missing path or reason");
      continue;
    }
    entries.push(item);
  }
  return { file: rel, entries, errors };
}

function allowlisted(rel, allow) {
  return allow.entries.some((e) => e.path === rel);
}

function stripDomainKeep(src) {
  return src.replace(
    /luxury_bag|luxury-bag|luxuryBag|LuxuryBag|luxuryBagSeeds|assertLuxuryBag/g,
    "DOMAIN_KEEP",
  );
}

function addFinding(findings, row) {
  const key = [row.file, row.kind, row.symbol].join("::");
  if (findings.has(key)) return;
  findings.set(key, row);
}

function scanSource(rel, src, findings) {
  const cleaned = stripDomainKeep(src);
  const lines = cleaned.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const n = String(i + 1);

    if (
      /from\s+["']@aipo\/ui\/components\/lux(?:\/[^"']+)?["']/.test(line) ||
      /from\s+["'][^"']*\/lux(?:\/[^"']+)?["']/.test(line) ||
      /from\s+["']\.\.?\/lux["']/.test(line)
    ) {
      addFinding(findings, {
        file: rel,
        kind: "import",
        symbol: line.trim(),
        line: n,
        classification: "LUX_RUNTIME_IMPORT",
      });
    }

    if (
      /from\s+["']@aipo\/ui\/tokens["']/.test(line) ||
      /from\s+["'][^"']*lux-fintech["']/.test(line) ||
      /luxFintech\b/.test(line)
    ) {
      addFinding(findings, {
        file: rel,
        kind: "token",
        symbol: line.trim(),
        line: n,
        classification: "LUX_RUNTIME_TOKEN",
      });
    }

    if (
      /@import\s+["'][^"']*lux-theme\.css["']/.test(line) ||
      /@import\s+["']@aipo\/ui\/tokens\/lux-theme\.css["']/.test(line)
    ) {
      addFinding(findings, {
        file: rel,
        kind: "css-import",
        symbol: line.trim(),
        line: n,
        classification: "LUX_RUNTIME_CSS",
      });
    }

    if (
      /import\(\s*["'][^"']*\/lux(?:\/[^"']*)?["']/.test(line) ||
      /import\(\s*["']@aipo\/ui\/components\/lux[^"']*["']/.test(line) ||
      /import\(\s*["'][^"']*lux-theme\.css["']/.test(line)
    ) {
      addFinding(findings, {
        file: rel,
        kind: "dynamic-import",
        symbol: line.trim(),
        line: n,
        classification: "LUX_RUNTIME_IMPORT",
      });
    }

    if (
      /--(?:color|radius|space|shadow|font|layout)-lux-/.test(line) ||
      /var\(--(?:color|radius|space|shadow|font|layout)-lux-/.test(line)
    ) {
      const alias =
        /--st-/.test(line) ||
        (/--(?!color-lux|radius-lux|space-lux|shadow-lux|font-lux|layout-lux)[a-z0-9-]+:\s*var\(--(?:color|radius|space|shadow|font|layout)-lux-/.test(
          line,
        ));
      addFinding(findings, {
        file: rel,
        kind: alias ? "alias" : "css-var",
        symbol: line.trim().slice(0, 160),
        line: n,
        classification: alias ? "LUX_RUNTIME_TOKEN" : "LUX_RUNTIME_CSS",
      });
    }

    if (
      /\b(?:text|bg|border|shadow|rounded|font)-lux-/.test(line) ||
      /\.lux-[\w-]+/.test(line)
    ) {
      addFinding(findings, {
        file: rel,
        kind: "class",
        symbol: line.trim().slice(0, 160),
        line: n,
        classification: "LUX_RUNTIME_CLASS",
      });
    }
  }
}

function scanPackageExports(rel, src, findings) {
  let json;
  try {
    json = JSON.parse(src);
  } catch {
    return;
  }
  const exportsMap = json.exports || {};
  for (const [key, value] of Object.entries(exportsMap)) {
    const text = `${key} ${value}`;
    if (/lux/i.test(text) && !DOMAIN_KEEP_RE.test(text)) {
      addFinding(findings, {
        file: rel,
        kind: "export",
        symbol: `${key} -> ${value}`,
        line: "exports",
        classification: "LUX_RUNTIME_EXPORT",
      });
    }
  }
}

function scanTree(root, extraFiles) {
  const files = [];
  for (const relRoot of SCAN_ROOTS) {
    walk(path.join(root, relRoot), root, files);
  }
  for (const extra of extraFiles || []) {
    if (!files.includes(extra) && fs.existsSync(path.join(root, extra))) {
      files.push(extra);
    }
  }
  return files.sort();
}

function classifyFileRole(rel, findings) {
  if (rel === "packages/ui/tokens/lux-fintech.ts") {
    addFinding(findings, {
      file: rel,
      kind: "token-source",
      symbol: "luxFintech",
      line: "file",
      classification: "LUX_RUNTIME_TOKEN",
    });
  }
  if (rel === "packages/ui/tokens/lux-theme.css") {
    addFinding(findings, {
      file: rel,
      kind: "theme-source",
      symbol: "lux-theme.css",
      line: "file",
      classification: "LUX_RUNTIME_CSS",
    });
  }
  if (rel.startsWith("packages/ui/components/lux/")) {
    addFinding(findings, {
      file: rel,
      kind: "component",
      symbol: path.posix.basename(rel),
      line: "file",
      classification: "LUX_COMPONENT_DEPENDENCY",
    });
  }
}

function toRow(finding) {
  const home = isHome(finding.file);
  const accountHub = isAccountHubResidual(finding.file);
  const productionRuntime = ![
    "HISTORICAL_DOCUMENT_KEEP",
    "NO_LUX_VERIFIER_KEEP",
    "DOMAIN_LUXURY_BAG_KEEP",
    "FALSE_POSITIVE",
  ].includes(finding.classification);
  let requiredApproval = "UI2_ZERO_LUX_RUNTIME_MIGRATION_NON_HOME_V1";
  let blocker = "legacy design runtime still shipping";
  if (home) {
    requiredApproval = "Home Founder OPEN";
    blocker = "Home LOCKED";
  } else if (isAccountHubLock(finding.file)) {
    requiredApproval = "Account Hub founder revision";
    blocker = "Account Hub FOUNDER_APPROVED_LOCKED";
  }
  return {
    file: finding.file,
    lineOrSymbol: `${finding.line}:${finding.kind}:${finding.symbol}`.slice(0, 220),
    classification: finding.classification,
    surface: surfaceOf(finding.file),
    productionRuntime,
    home,
    accountHub,
    removalMethod: "replace with spark-toss tokens/primitives in a later approved slice",
    requiredApproval,
    blocker,
  };
}

function scan(root, options) {
  const opts = options || {};
  const allow = loadAllowlist(root);
  const findings = new Map();
  const files = opts.files || scanTree(root, ["packages/ui/package.json"]);
  const order = opts.reverse ? [...files].reverse() : files;

  for (const rel of order) {
    if (allowlisted(rel, allow)) continue;
    const ext = path.extname(rel);
    if (!CODE_EXT.has(ext)) continue;
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, "utf8");
    classifyFileRole(rel, findings);
    if (rel.endsWith("package.json")) scanPackageExports(rel, src, findings);
    else scanSource(rel, src, findings);
  }

  const rows = [...findings.values()].map(toRow);
  rows.sort((a, b) =>
    `${a.file}|${a.lineOrSymbol}`.localeCompare(`${b.file}|${b.lineOrSymbol}`),
  );
  return {
    allow,
    rows,
    filesScanned: files.length,
    homeRows: rows.filter((r) => r.home),
    accountHubRows: rows.filter((r) => r.accountHub),
    accountHubLockRows: rows.filter((r) => isAccountHubLock(r.file)),
    runtimeRows: rows.filter((r) => r.productionRuntime),
  };
}

function inventoryKeys(rows) {
  return rows.map((r) => `${r.file}::${r.classification}`).sort();
}

function uniqueFiles(rows) {
  return [...new Set(rows.map((r) => r.file))].sort();
}

function foundationCopiesLegacy(root) {
  const fails = [];
  const files = [
    "packages/ui/tokens/spark-toss-tokens.ts",
    "packages/ui/tokens/spark-toss-theme.css",
    "packages/ui/tokens/spark-toss-states.ts",
  ];
  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      fails.push(`missing foundation file ${rel}`);
      continue;
    }
    const src = fs.readFileSync(abs, "utf8").toLowerCase();
    if (/var\(--(?:color|radius|space|shadow|font|layout)-lux-/.test(src)) {
      fails.push(`${rel} aliases a legacy CSS variable`);
    }
    for (const hex of LUX_HEX) {
      if (src.includes(hex)) fails.push(`${rel} copies legacy hex ${hex}`);
    }
    if (rel.endsWith(".ts") && /from\s+["'].*lux/.test(src)) {
      fails.push(`${rel} imports a legacy module`);
    }
  }
  return fails;
}

function loadInventory(root) {
  const rel = "governance/design-system/legacy-design-runtime-inventory.v1.json";
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return { rel, missing: true, json: null };
  return { rel, missing: false, json: JSON.parse(fs.readFileSync(abs, "utf8")) };
}

module.exports = {
  SCAN_ROOTS,
  ACCOUNT_HUB_LOCK,
  DOMAIN_KEEP_RE,
  walk,
  scan,
  scanTree,
  loadAllowlist,
  loadInventory,
  inventoryKeys,
  uniqueFiles,
  foundationCopiesLegacy,
  isHome,
  isAccountHubLock,
  posix,
};
