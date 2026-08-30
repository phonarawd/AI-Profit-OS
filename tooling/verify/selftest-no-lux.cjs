/**
 * Hermetic selftest for verify:no-lux.
 * Uses a temp tree. Does not mutate product files.
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  scan,
  loadAllowlist,
  inventoryKeys,
  foundationCopiesLegacy,
} = require("./lib/no-lux-detector.cjs");

const repo = path.resolve(__dirname, "../..");
const fails = [];

function check(id, cond, detail) {
  if (cond) console.log("  PASS " + id);
  else {
    fails.push(id + (detail ? " — " + detail : ""));
    console.error("  FAIL " + id + (detail ? " — " + detail : ""));
  }
}

function write(root, rel, body) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
}

function makeSandbox(suffix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `no-lux-${suffix}-`));
  write(
    root,
    "governance/design-system/no-lux-allowlist.v1.json",
    JSON.stringify({
      schema: "governance.design-system.no-lux-allowlist.v1",
      version: "1.0.0",
      entries: [
        {
          path: "docs/legacy-design-ban.md",
          reason: "HISTORICAL_DOCUMENT_KEEP: prohibition note",
        },
        {
          path: "tooling/verify/no-lux.cjs",
          reason: "NO_LUX_VERIFIER_KEEP: detector phrase",
        },
      ],
    }),
  );
  return root;
}

function rm(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

const importBox = makeSandbox("import");
write(
  importBox,
  "apps/web/app/page.tsx",
  'import { MotionCTA } from "@aipo/ui/components/lux";\n',
);
{
  const r = scan(importBox);
  check(
    "runtime-import",
    r.runtimeRows.some((x) => x.classification === "LUX_RUNTIME_IMPORT"),
    JSON.stringify(r.runtimeRows.map((x) => x.classification)),
  );
}
rm(importBox);

const aliasBox = makeSandbox("alias");
write(
  aliasBox,
  "packages/ui/tokens/pretty-tokens.ts",
  'export { luxFintech as prettyTokens } from "./lux-fintech";\n',
);
{
  const r = scan(aliasBox);
  check(
    "renamed-alias",
    r.runtimeRows.some((x) => /luxFintech|lux-fintech/.test(x.lineOrSymbol)),
  );
}
rm(aliasBox);

const cssBox = makeSandbox("css-alias");
write(
  cssBox,
  "apps/web/app/theme.css",
  ":root { --st-color-canvas: var(--color-lux-bg); }\n",
);
{
  const r = scan(cssBox);
  check(
    "css-var-alias",
    r.runtimeRows.some((x) => x.kind === "alias" || /--color-lux-bg/.test(x.lineOrSymbol)),
  );
}
rm(cssBox);

const exportBox = makeSandbox("export");
write(
  exportBox,
  "packages/ui/package.json",
  JSON.stringify({
    name: "@aipo/ui",
    exports: { "./pretty": "./tokens/lux-fintech.ts" },
  }),
);
{
  const r = scan(exportBox);
  check(
    "package-export",
    r.runtimeRows.some((x) => x.classification === "LUX_RUNTIME_EXPORT"),
  );
}
rm(exportBox);

const dynBox = makeSandbox("dynamic");
write(
  dynBox,
  "apps/web/app/lazy.ts",
  'export const load = () => import("@aipo/ui/components/lux/MotionCTA");\n',
);
{
  const r = scan(dynBox);
  check(
    "dynamic-import",
    r.runtimeRows.some((x) => /dynamic-import/.test(x.lineOrSymbol)),
  );
}
rm(dynBox);

const bagBox = makeSandbox("bag");
write(
  bagBox,
  "apps/web/app/catalog.ts",
  'export const category = "luxury_bag";\nexport const icon = "luxuryBag";\n',
);
{
  const r = scan(bagBox);
  check("luxury-bag-allowed", r.runtimeRows.length === 0, String(r.runtimeRows.length));
}
rm(bagBox);

const histBox = makeSandbox("hist");
write(
  histBox,
  "docs/legacy-design-ban.md",
  "LUX design runtime is forbidden. lux-theme.css must not return.\n",
);
{
  const r = scan(histBox);
  check("historical-doc-allowed", r.runtimeRows.length === 0);
}
rm(histBox);

const verBox = makeSandbox("ver");
write(
  verBox,
  "tooling/verify/no-lux.cjs",
  'console.log("verify:no-lux detects lux-theme.css and luxFintech");\n',
);
{
  const r = scan(verBox);
  check("verifier-phrase-allowed", r.runtimeRows.length === 0);
}
rm(verBox);

const fpBox = makeSandbox("fp");
write(
  fpBox,
  "apps/web/app/ok.ts",
  'export const deluxe = true;\nexport const flux = 1;\nexport const luxury_bag = "keep";\n',
);
{
  const r = scan(fpBox);
  check("false-positive", r.runtimeRows.length === 0, JSON.stringify(r.runtimeRows));
}
rm(fpBox);

const reasonBox = makeSandbox("reason");
write(
  reasonBox,
  "governance/design-system/no-lux-allowlist.v1.json",
  JSON.stringify({
    schema: "governance.design-system.no-lux-allowlist.v1",
    version: "1.0.0",
    entries: [{ path: "docs/x.md" }],
  }),
);
{
  const allow = loadAllowlist(reasonBox);
  check("allowlist-reason-required", allow.errors.length > 0);
}
rm(reasonBox);

const homeBox = makeSandbox("home");
write(
  homeBox,
  "apps/web/app/HomePageClient.tsx",
  'import { CountUpNumber } from "@aipo/ui/components/lux";\n',
);
write(homeBox, "apps/web/app/wallet/page.tsx", 'export default function W(){return null}\n');
{
  const r = scan(homeBox);
  check("home-residual-separate", r.homeRows.length >= 1 && r.homeRows.every((x) => x.home));
}
rm(homeBox);

const hubBox = makeSandbox("hub");
write(
  hubBox,
  "apps/web/app/me/AccountHub.tsx",
  'export function AccountHub(){return <div className="text-lux-accent" />}\n',
);
{
  const r = scan(hubBox);
  check("account-hub-watch", r.accountHubLockRows.length >= 1);
}
rm(hubBox);

const revBox = makeSandbox("rev");
write(revBox, "apps/web/app/a.tsx", 'import { Badge } from "@aipo/ui/components/lux";\n');
write(revBox, "apps/web/app/b.tsx", 'export const x = "text-lux-text";\n');
{
  const a = scan(revBox, { reverse: false });
  const b = scan(revBox, { reverse: true });
  check(
    "forward-reverse",
    inventoryKeys(a.runtimeRows).join("|") === inventoryKeys(b.runtimeRows).join("|"),
  );
}
rm(revBox);

const foundationFails = foundationCopiesLegacy(repo);
check("foundation-no-legacy-copy", foundationFails.length === 0, foundationFails.join(";"));

const live = spawnSync(process.execPath, [path.join(repo, "tooling/verify/no-lux.cjs")], {
  cwd: repo,
  encoding: "utf8",
  env: { ...process.env, NO_LUX_INNER: "1" },
});
check(
  "live-detector-invocable",
  live.status === 0 || /inventory missing/.test(String(live.stderr || "")),
  String(live.stderr || live.stdout || live.status),
);

if (fails.length) {
  console.error("[selftest-no-lux] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[selftest-no-lux] PASS " + "13 cases");
