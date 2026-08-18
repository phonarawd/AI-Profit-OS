/**
 * verify:stack-lock (ADR-014 · ADR-015 · ADR-016)
 * Docker optional when Supabase remote configured.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist("AGENTS.md");
mustExist("TOOLCHAIN.md");
mustExist("package.json");
mustExist("pnpm-workspace.yaml");
mustExist(".npmrc");
mustExist(".node-version");
mustExist("rust-toolchain.toml");
mustExist(".cursor/rules/stack-lock.mdc");
mustExist(".cursor/rules/phase-activation.mdc");
mustExist(".cursor/rules/greenfield-ui.mdc");
mustExist(".cursor/rules/phase0-ram.mdc");
mustExist(".cursor/rules/git-safety.mdc");
mustExist(".cursor/hooks.json");
mustExist("packages/ui/tokens/lux-fintech.ts");
mustExist("packages/ui/tokens/lux-theme.css");
mustExist("packages/ui/brand/brand.manifest.json");
mustExist("packages/sdk/package.json");
mustExist("packages/schemas/package.json");
mustExist("apps/web/package.json");
mustExist("apps/web/routes.ts");
mustExist("apps/admin/package.json");
mustExist("apps/admin/routes.ts");
mustExist("services/api-nest/package.json");
mustExist("services/engine-rust/Cargo.toml");
mustExist("tooling/verify/CATALOG.md");
mustExist(".cursor/mcp.json");
mustExist("infra/web/wrangler.toml");
mustExist("infra/ops/wrangler.toml");
mustExist("infra/workers.manifest.json");
mustExist("workers/tsconfig.base.json");
mustExist(".github/workflows/deploy-cloudflare.yml");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.packageManager !== "pnpm@10.14.0") {
  fails.push(`packageManager must be pnpm@10.14.0 (got ${pkg.packageManager})`);
}
if (!pkg.engines?.node?.includes("22")) {
  fails.push(`engines.node must pin Node 22 (got ${pkg.engines?.node})`);
}

const stackLock = fs.readFileSync(
  path.join(root, ".cursor/rules/stack-lock.mdc"),
  "utf8"
);
if (!stackLock.includes("next@16")) fails.push("stack-lock.mdc must pin next@16");
if (!stackLock.includes("tailwindcss@4") && !stackLock.includes("Tailwind v4")) {
  fails.push("stack-lock.mdc must pin Tailwind v4");
}
if (!stackLock.includes("퍼뜩")) fails.push("stack-lock.mdc must name 퍼뜩");
if (!stackLock.includes("Cloudflare")) fails.push("stack-lock.mdc must lock Cloudflare");

function ensureCargoBinOnPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) return;
  const cargoBin = path.join(home, ".cargo", "bin");
  const rustcName = process.platform === "win32" ? "rustc.exe" : "rustc";
  if (!fs.existsSync(path.join(cargoBin, rustcName))) return;
  const sep = process.platform === "win32" ? ";" : ":";
  const pathKey = process.platform === "win32" ? "Path" : "PATH";
  const norm = (p) => p.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "");
  const target = norm(cargoBin);
  const parts = (process.env[pathKey] || "").split(sep).filter(Boolean);
  if (parts.some((p) => norm(p) === target)) return;
  process.env[pathKey] = cargoBin + sep + (process.env[pathKey] || "");
}

function tryCmd(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

ensureCargoBinOnPath();

const nodeV = tryCmd("node -v");
if (!nodeV || !nodeV.startsWith("v22.")) {
  fails.push(`Node 22 required (got ${nodeV || "missing"})`);
}

const pnpmV = tryCmd("pnpm -v");
if (!pnpmV || !pnpmV.startsWith("10.")) {
  fails.push(`pnpm 10.x required (got ${pnpmV || "missing"})`);
}

const rustc = tryCmd("rustc -V");
if (!rustc) fails.push("rustc missing — see TOOLCHAIN.md");

// Docker-less OK if Supabase URL present in .env
let supabaseOk = false;
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  supabaseOk = /SUPABASE_URL=https:\/\/.+\.supabase\.co/.test(env);
}
const docker = tryCmd("docker -v");
if (!supabaseOk && !docker) {
  fails.push("need Supabase .env SUPABASE_URL (Docker-less) or Docker installed");
}

if (fails.length) {
  console.error("[verify:stack-lock] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:stack-lock] PASS");
console.log(`  node ${nodeV} · pnpm ${pnpmV}`);
console.log(`  ${rustc}`);
console.log(
  supabaseOk
    ? "  DB mode: remote Supabase (Docker optional)"
    : `  DB mode: docker available (${docker})`
);
