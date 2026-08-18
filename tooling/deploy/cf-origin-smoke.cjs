#!/usr/bin/env node
/**
 * Post-deploy / CI smoke — OpenNext Workers origin HTTP 살아있는지 확인
 * Usage: node tooling/deploy/cf-origin-smoke.cjs [web|ops|all]
 */
const fs = require("fs");
const path = require("path");
const { root } = require("./lib/env.cjs");

const surface = process.argv[2] || "all";
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "infra/domain.manifest.json"), "utf8")
);

/** @type {{ key: string, host: string, ok: (status: number, headers: Headers, body: string) => boolean }[]} */
const checks = [];

if (surface === "web" || surface === "all") {
  checks.push({
    key: "web",
    host: manifest.openNext.web.workersDev,
    ok: (status, headers, body) =>
      status === 200 &&
      (headers.get("x-opennext") === "1" ||
        /퍼뜩|x-powered-by:\s*Next\.js/i.test(
          `${headers.get("x-powered-by") || ""}\n${body.slice(0, 500)}`
        )),
  });
}
if (surface === "ops" || surface === "all") {
  checks.push({
    key: "ops",
    host: manifest.openNext.ops.workersDev,
    ok: (status, headers) =>
      (status === 200 || status === 307 || status === 308) &&
      (headers.get("x-opennext") === "1" ||
        status === 307 ||
        status === 308),
  });
}

async function smokeOne({ key, host, ok }) {
  const url = `https://${host}/`;
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-cf-origin-smoke/1" },
  });
  const body = await res.text();
  if (!ok(res.status, res.headers, body)) {
    throw new Error(
      `${key} FAIL ${url} status=${res.status} x-opennext=${res.headers.get("x-opennext")}`
    );
  }
  console.log(`[cf:origin-smoke] PASS ${key} · ${url} · ${res.status}`);
}

(async () => {
  if (!manifest.openNext?.web?.workersDev) {
    console.error("[cf:origin-smoke] FAIL: domain.manifest openNext missing");
    process.exit(1);
  }
  try {
    for (const c of checks) await smokeOne(c);
  } catch (e) {
    console.error(`[cf:origin-smoke] ${e.message || e}`);
    console.error(
      "[cf:origin-smoke] OpenNext Workers origin dead — pages.dev 재사용 금지 · wrangler/Workers 재배포"
    );
    process.exit(1);
  }
})();
