/**
 * verify:workers-types — @cloudflare/workers-types must resolve for every worker (IDE + wrangler tsc)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function hasWorkersTypes(fromDir) {
  let dir = fromDir;
  while (dir) {
    const typesFile = path.join(
      dir,
      "node_modules",
      "@cloudflare",
      "workers-types",
      "index.d.ts"
    );
    if (fs.existsSync(typesFile)) return true;
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return false;
}

const rootPkg = readJson("package.json");
if (!rootPkg.devDependencies?.["@cloudflare/workers-types"]) {
  fails.push("package.json: missing root devDependency @cloudflare/workers-types (SSOT)");
}

const baseTs = path.join(root, "workers/tsconfig.base.json");
if (!fs.existsSync(baseTs)) {
  fails.push("missing workers/tsconfig.base.json");
} else {
  const base = readJson("workers/tsconfig.base.json");
  const types = base.compilerOptions?.types;
  if (!Array.isArray(types) || !types.includes("@cloudflare/workers-types")) {
    fails.push("workers/tsconfig.base.json must set types: [@cloudflare/workers-types]");
  }
}

const workersDir = path.join(root, "workers");
const workerNames = fs
  .readdirSync(workersDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => fs.existsSync(path.join(workersDir, name, "package.json")))
  .sort();

if (workerNames.length === 0) {
  fails.push("workers/: no worker packages found");
}

for (const name of workerNames) {
  const relPkg = `workers/${name}/package.json`;
  const relTs = `workers/${name}/tsconfig.json`;
  const workerDir = path.join(workersDir, name);

  if (!fs.existsSync(path.join(root, relTs))) {
    fails.push(`missing ${relTs}`);
    continue;
  }

  const ts = readJson(relTs);
  if (ts.extends !== "../tsconfig.base.json") {
    fails.push(`${relTs}: must extend ../tsconfig.base.json`);
  }

  const pkg = readJson(relPkg);
  if (!pkg.devDependencies?.["@cloudflare/workers-types"]) {
    fails.push(`${relPkg}: missing devDependency @cloudflare/workers-types`);
  }

  if (!hasWorkersTypes(workerDir)) {
    fails.push(
      `${name}: cannot resolve @cloudflare/workers-types — run pnpm install at repo root`
    );
  }
}

if (!hasWorkersTypes(root)) {
  fails.push("root: cannot resolve @cloudflare/workers-types — run pnpm install at repo root");
}

if (fails.length) {
  console.error("[verify:workers-types] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(`[verify:workers-types] PASS (${workerNames.length} workers · types resolvable)`);
