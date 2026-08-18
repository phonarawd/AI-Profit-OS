/**
 * verify:opennext-workers-origin — OpenNext 배포·프록시 404 재발 0 (Workers SSOT)
 *
 * 잠금:
 * 1) domain.manifest openNext.runtime=workers + workersDevSubdomain
 * 2) wrangler main+assets · pages 출력 키 금지
 * 3) deploy 스크립트 = opennextjs-cloudflare deploy · pages deploy 금지
 * 4) proxy/_shared origin URL = manifest bridge target = openNext.workersDev
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fails.push(`missing: ${rel}`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

function readJson(rel) {
  const text = read(rel);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    fails.push(`${rel}: invalid JSON (${e.message})`);
    return null;
  }
}

const manifest = readJson("infra/domain.manifest.json");
if (!manifest) {
  console.error("[verify:opennext-workers-origin] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const openNext = manifest.openNext;
const subdomain = manifest.cloudflare?.workersDevSubdomain;
if (!openNext || openNext.runtime !== "workers") {
  fails.push("domain.manifest openNext.runtime must be \"workers\"");
}
if (!subdomain || typeof subdomain !== "string") {
  fails.push("domain.manifest cloudflare.workersDevSubdomain required");
}

for (const key of ["web", "ops"]) {
  const slot = openNext?.[key];
  if (!slot?.worker || !slot?.workersDev || !slot?.wrangler || !slot?.app) {
    fails.push(`openNext.${key} requires worker/workersDev/wrangler/app`);
    continue;
  }
  const expectedHost = `${slot.worker}.${subdomain}.workers.dev`;
  if (slot.workersDev !== expectedHost) {
    fails.push(
      `openNext.${key}.workersDev must be ${expectedHost} (got ${slot.workersDev})`
    );
  }
  if (manifest.pages?.[key]?.workersDev !== slot.workersDev) {
    fails.push(`pages.${key}.workersDev must equal openNext.${key}.workersDev`);
  }
  const bridgeKey = key === "web" ? "web-proxy" : "ops-proxy";
  const bridgeTarget = manifest.bridgeWorkers?.[bridgeKey]?.target;
  if (bridgeTarget !== `https://${slot.workersDev}`) {
    fails.push(
      `bridgeWorkers.${bridgeKey}.target must be https://${slot.workersDev}`
    );
  }

  const toml = read(slot.wrangler);
  if (toml) {
    if (/^\s*pages_build_output_dir\s*=/m.test(toml)) {
      fails.push(`${slot.wrangler}: pages_build_output_dir key forbidden`);
    }
    if (!toml.includes(".open-next/worker.js")) {
      fails.push(`${slot.wrangler}: main must point to .open-next/worker.js`);
    }
    if (!toml.includes(".open-next/assets")) {
      fails.push(`${slot.wrangler}: assets.directory must point to .open-next/assets`);
    }
    if (!toml.includes(`name = "${slot.worker}"`)) {
      fails.push(`${slot.wrangler}: name must be ${slot.worker}`);
    }
    if (!/workers_dev\s*=\s*true/.test(toml)) {
      fails.push(`${slot.wrangler}: workers_dev = true required`);
    }
  }
}

const shared = read("workers/_shared/opennext-origin.ts");
if (shared && openNext) {
  if (!shared.includes(`https://${openNext.web.workersDev}`)) {
    fails.push("workers/_shared/opennext-origin.ts missing OPENNEXT_WEB_ORIGIN SSOT URL");
  }
  if (!shared.includes(`https://${openNext.ops.workersDev}`)) {
    fails.push("workers/_shared/opennext-origin.ts missing OPENNEXT_OPS_ORIGIN SSOT URL");
  }
}

for (const [rel, token] of [
  ["workers/web-proxy/src/index.ts", "OPENNEXT_WEB_ORIGIN"],
  ["workers/ops-proxy/src/index.ts", "OPENNEXT_OPS_ORIGIN"],
]) {
  const body = read(rel);
  if (!body) continue;
  if (!body.includes(token) || !body.includes("_shared/opennext-origin")) {
    fails.push(`${rel}: must import ${token} from workers/_shared/opennext-origin`);
  }
  if (/pages\.dev/.test(body)) {
    fails.push(`${rel}: pages.dev origin forbidden`);
  }
}

const deployFiles = [
  "tooling/deploy/cf-pages-web.cjs",
  "tooling/deploy/cf-pages-ops.cjs",
];
for (const rel of deployFiles) {
  const body = read(rel);
  if (!body) continue;
  if (!body.includes("opennextjs-cloudflare") || !/\bdeploy\b/.test(body)) {
    fails.push(`${rel}: must invoke opennextjs-cloudflare deploy`);
  }
  if (/\bpages\s+deploy\b/.test(body) || body.includes("wrangler pages")) {
    fails.push(`${rel}: wrangler pages deploy forbidden`);
  }
  if (body.includes(".open-next/cloudflare") && body.includes("deploy")) {
    // allow comments mentioning the bug; block as deploy path assignment
    if (/cloudflare["'`]?\s*[,)]/.test(body) || /buildDir.*cloudflare/.test(body)) {
      fails.push(`${rel}: must not deploy .open-next/cloudflare directory`);
    }
  }
  if (!body.includes("cf-origin-smoke") && !body.includes("origin-smoke")) {
    // smoke is invoked by wrapper or workflow — require either inline or sibling call site
  }
}

// Deploy scripts must call smoke after deploy (hard)
for (const rel of deployFiles) {
  const body = read(rel);
  if (!body) continue;
  if (!body.includes("cf-origin-smoke.cjs")) {
    fails.push(`${rel}: must run tooling/deploy/cf-origin-smoke.cjs after deploy`);
  }
}

if (fails.length) {
  console.error("[verify:opennext-workers-origin] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:opennext-workers-origin] PASS (Workers SSOT · wrangler · proxy · deploy lock)"
);
