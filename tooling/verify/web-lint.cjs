/**
 * verify:web-lint — REL-011
 * apps/web lint는 실제 ESLint. no-op echo 금지. 의도적 구문 오류는 FAIL.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const webRoot = path.join(root, "apps/web");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const pkgRaw = read("apps/web/package.json");
const pkg = pkgRaw ? JSON.parse(pkgRaw) : {};
const lint = pkg.scripts && pkg.scripts.lint;

if (!lint || /echo\s+['"]lint:/.test(lint) || /domain todo/i.test(lint)) {
  fails.push("apps/web lint script is still a no-op");
}
if (!/\beslint\b/.test(String(lint || ""))) {
  fails.push("apps/web lint script must invoke eslint");
}

const configCandidates = [
  "apps/web/eslint.config.mjs",
  "apps/web/eslint.config.js",
  "apps/web/eslint.config.cjs",
];
const configRel = configCandidates.find((p) =>
  fs.existsSync(path.join(root, p)),
);
if (!configRel) {
  fails.push("eslint.config missing under apps/web (do not enable eslint without config)");
} else {
  const cfg = read(configRel);
  if (/['"]\.\.\/\.\.\/\.cursor\/plans/.test(cfg) || /['"]\.\.\/\.\.\/docs\//.test(cfg)) {
    fails.push("eslint config must not lint plans/docs");
  }
}

const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
if (!deps.eslint) fails.push("apps/web must depend on eslint");

const rootPkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!rootPkg.includes('"verify:web-lint"')) {
  fails.push("package.json missing verify:web-lint");
}
if (!catalog.includes("web-lint")) {
  fails.push("CATALOG.md must list web-lint");
}
if (!domain.includes("web-lint.cjs")) {
  fails.push("domain-by-path must trigger web-lint");
}

function resolveEslintBin() {
  for (const start of [webRoot, root]) {
    try {
      const pkgJson = require.resolve("eslint/package.json", { paths: [start] });
      const bin = path.join(path.dirname(pkgJson), "bin", "eslint.js");
      if (fs.existsSync(bin)) return bin;
    } catch {
      /* try next */
    }
  }
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    const hit = fs
      .readdirSync(pnpmDir)
      .find((name) => name.startsWith("eslint@"));
    if (hit) {
      const bin = path.join(
        pnpmDir,
        hit,
        "node_modules",
        "eslint",
        "bin",
        "eslint.js",
      );
      if (fs.existsSync(bin)) return bin;
    }
  }
  return "";
}

function runLint() {
  const bin = resolveEslintBin();
  if (!bin) {
    return { status: 1, stdout: "", stderr: "eslint binary not resolved" };
  }
  return spawnSync(process.execPath, [bin, "."], {
    cwd: webRoot,
    encoding: "utf8",
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
    },
  });
}

if (fails.length === 0) {
  const clean = runLint();
  process.stdout.write(clean.stdout || "");
  process.stderr.write(clean.stderr || "");
  if (clean.status !== 0) {
    fails.push("clean lint must PASS (see eslint output)");
  }

  const probe = path.join(webRoot, "_rel011_intentional_syntax_error.tsx");
  try {
    fs.writeFileSync(probe, "export const REL011_PROBE = (\n", "utf8");
    const broken = runLint();
    if (broken.status === 0) {
      fails.push(
        "intentional syntax error did not make lint FAIL (no-op residual)",
      );
    }
  } finally {
    if (fs.existsSync(probe)) fs.unlinkSync(probe);
  }
}

if (fails.length) {
  console.error("[verify:web-lint] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:web-lint] PASS (eslint inspects apps/web · syntax error FAIL · no-op 0)",
);
