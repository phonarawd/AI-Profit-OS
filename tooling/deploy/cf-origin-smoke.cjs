#!/usr/bin/env node
/**
 * Post-deploy / CI smoke for OpenNext Workers origin HTTP.
 * Usage: node tooling/deploy/cf-origin-smoke.cjs [web|ops|all] [production|staging|preview]
 */
const fs = require("fs");
const path = require("path");
const { root, isStagingSlot } = require("./lib/env.cjs");

const surface = process.argv[2] || "all";
const slotArg = process.argv[3] || "production";
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "infra/domain.manifest.json"), "utf8")
);

function hostFor(key) {
  if (isStagingSlot(slotArg)) {
    const staging = manifest.openNext && manifest.openNext.staging
      ? manifest.openNext.staging[key]
      : null;
    if (!staging || !staging.workersDev) {
      throw new Error("domain.manifest openNext.staging." + key + ".workersDev missing");
    }
    return staging.workersDev;
  }
  const host = manifest.openNext && manifest.openNext[key]
    ? manifest.openNext[key].workersDev
    : null;
  if (!host) throw new Error("domain.manifest openNext." + key + ".workersDev missing");
  return host;
}

const checks = [];

if (surface === "web" || surface === "all") {
  checks.push({
    key: "web",
    host: hostFor("web"),
    ok: function (status, headers, body) {
      return (
        status === 200 &&
        (headers.get("x-opennext") === "1" ||
          /퍼뜩|x-powered-by:\s*Next\.js/i.test(
            (headers.get("x-powered-by") || "") + "\n" + body.slice(0, 500)
          ))
      );
    },
  });
}
if (surface === "ops" || surface === "all") {
  checks.push({
    key: "ops",
    host: hostFor("ops"),
    ok: function (status, headers) {
      return (
        (status === 200 || status === 307 || status === 308) &&
        (headers.get("x-opennext") === "1" || status === 307 || status === 308)
      );
    },
  });
}

async function smokeOne(check) {
  const url = "https://" + check.host + "/";
  const res = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": "ai-profit-os-cf-origin-smoke/1" },
  });
  const body = await res.text();
  if (!check.ok(res.status, res.headers, body)) {
    throw new Error(
      check.key +
        " FAIL " +
        url +
        " status=" +
        res.status +
        " x-opennext=" +
        res.headers.get("x-opennext")
    );
  }
  console.log("[cf:origin-smoke] PASS " + check.key + " " + url + " " + res.status);
}

(async function main() {
  if (!manifest.openNext || !manifest.openNext.web || !manifest.openNext.web.workersDev) {
    console.error("[cf:origin-smoke] FAIL: domain.manifest openNext missing");
    process.exit(1);
  }
  try {
    for (const c of checks) await smokeOne(c);
  } catch (e) {
    console.error("[cf:origin-smoke] " + (e.message || e));
    console.error(
      "[cf:origin-smoke] OpenNext Workers origin dead — do not reuse pages.dev"
    );
    process.exit(1);
  }
})();
