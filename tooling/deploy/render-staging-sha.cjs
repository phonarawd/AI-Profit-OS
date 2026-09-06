#!/usr/bin/env node
/**
 * Render staging API만 지정 SHA로 배포. production 서비스 ID 거절.
 */
"use strict";

const { spawnSync } = require("child_process");
const { loadDotEnv, root } = require("./lib/env.cjs");

loadDotEnv();

const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const token = process.env.RENDER_API_KEY || "";
const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
const sha =
  process.argv[2] ||
  spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();

if (!token) {
  console.error("[render-staging-sha] BLOCKED_EXTERNAL: RENDER_API_KEY missing");
  process.exit(2);
}
if (!sha || !/^[0-9a-f]{40}$/i.test(sha)) {
  console.error("[render-staging-sha] FAIL: commit SHA required");
  process.exit(1);
}
if (sha.toLowerCase() === "7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f") {
  console.error("[render-staging-sha] FAIL: 7c6a2b0a is not a candidate SHA");
  process.exit(1);
}
if (serviceId === PRODUCTION_SERVICE) {
  console.error("[render-staging-sha] FAIL: production service forbidden");
  process.exit(1);
}
if (serviceId !== STAGING_SERVICE) {
  console.error("[render-staging-sha] FAIL: unknown service id");
  process.exit(1);
}

(async function main() {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ clearCache: "do_not_clear", commitId: sha }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[render-staging-sha] FAIL: http " + res.status);
    process.exit(1);
  }
  const deploy = json && (json.id || (json.deploy && json.deploy.id) || json);
  console.log("[render-staging-sha] PASS · service=staging · sha=" + sha.slice(0, 8));
  console.log("deploy_id=" + (typeof deploy === "string" ? deploy : deploy && deploy.id));
})().catch((err) => {
  console.error("[render-staging-sha] FAIL: " + (err && err.message ? err.message : err));
  process.exit(1);
});
