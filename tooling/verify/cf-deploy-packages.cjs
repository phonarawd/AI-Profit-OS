/**
 * verify:cf-deploy-packages — deploy scripts must filter @aipo/* + build:cf (ADR-015)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const checks = [
  {
    file: "tooling/deploy/cf-pages-web.cjs",
    filter: "@aipo/web",
    script: "build:cf",
  },
  {
    file: "tooling/deploy/cf-pages-ops.cjs",
    filter: "@aipo/admin",
    script: "build:cf",
  },
];

for (const { file, filter, script } of checks) {
  if (!fs.existsSync(path.join(root, file))) {
    fails.push(`missing ${file}`);
    continue;
  }
  const body = read(file);
  if (!body.includes(filter)) {
    fails.push(`${file}: must use pnpm filter ${filter}`);
  }
  if (!body.includes(script)) {
    fails.push(`${file}: must invoke ${script} (OpenNext → worker.js + assets)`);
  }
  if (!body.includes("opennextjs-cloudflare") || !body.includes("deploy")) {
    fails.push(`${file}: must invoke opennextjs-cloudflare deploy (Workers)`);
  }
  if (body.includes("pages deploy") || body.includes("pages_build_output_dir")) {
    fails.push(`${file}: Pages deploy forbidden — OpenNext targets Workers`);
  }
  if (body.includes("@ai-profit-os/")) {
    fails.push(`${file}: stale @ai-profit-os/* filter forbidden`);
  }
}

for (const app of ["apps/web", "apps/admin"]) {
  const pkg = JSON.parse(read(`${app}/package.json`));
  if (!pkg.scripts?.["build:cf"]) {
    fails.push(`${app}/package.json: missing build:cf script`);
  }
  if (!pkg.devDependencies?.["@opennextjs/cloudflare"]) {
    fails.push(`${app}/package.json: missing @opennextjs/cloudflare devDependency`);
  }
  if (!fs.existsSync(path.join(root, app, "open-next.config.ts"))) {
    fails.push(`missing ${app}/open-next.config.ts`);
  }
}

if (fails.length) {
  console.error("[verify:cf-deploy-packages] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:cf-deploy-packages] PASS (@aipo/* · build:cf · OpenNext)");
