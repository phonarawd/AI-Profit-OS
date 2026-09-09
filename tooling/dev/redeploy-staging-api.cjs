#!/usr/bin/env node
/**
 * staging Render API만 재배포한다. production 서비스 거절.
 */
"use strict";

const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const STAGING_SERVICE = "srv-dabph32fngtc73esj8rg";
const PRODUCTION_SERVICE = "srv-da5r1tqjobas73fl16dg";
const FORBIDDEN_SHA = "7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f";

async function main() {
  const serviceId = process.env.RENDER_STAGING_SERVICE_ID || STAGING_SERVICE;
  if (serviceId === PRODUCTION_SERVICE) throw new Error("refused: production service id");
  if (serviceId !== STAGING_SERVICE) throw new Error("refused: unknown service id");
  const token = process.env.RENDER_API_KEY || "";
  if (!token) throw new Error("RENDER_API_KEY missing");
  const sha = process.argv[2] || "";
  if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("commit SHA required — default branch deploy forbidden");
  if (sha.toLowerCase() === FORBIDDEN_SHA) throw new Error("refused: 7c6a2b0a is not a candidate SHA");
  const res = await fetch("https://api.render.com/v1/services/" + serviceId + "/deploys", {
    method: "POST",
    headers: {
      authorization: "Bearer " + token,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ clearCache: "do_not_clear", commitId: sha }),
  });
  if (!res.ok) throw new Error("render http " + res.status);
  const body = await res.json();
  process.stdout.write(
    JSON.stringify(
      {
        target: "staging-render-service",
        productionDeploy: 0,
        deployId: body.id || (body.deploy && body.deploy.id) || null,
        status: body.status || (body.deploy && body.deploy.status) || null,
        commit: (body.commit && body.commit.id) || null,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((err) => {
  process.stderr.write("[redeploy-staging-api] FAIL: " + String(err && err.message ? err.message : err) + "\n");
  process.exit(1);
});
