#!/usr/bin/env node
"use strict";

/**
 * Founder-authorized live Nest promotion on the last-confirmed Render API.
 * Reads RENDER_API_KEY from repo-root .env. Never prints the key.
 * Default is inspect-only. Mutation requires --apply and an exact 40-char SHA.
 */
const {
  LAST_CONFIRMED_PRODUCTION_RENDER,
} = require("../release/render-api-promotion-readiness.cjs");
const { loadDotEnv } = require("../deploy/lib/env.cjs");

loadDotEnv();

const SERVICE_ID = LAST_CONFIRMED_PRODUCTION_RENDER.service_id;
const API = "https://api.render.com/v1";

function fail(code) {
  process.stderr.write("[apply-live-api-promotion] FAIL_CLOSED:" + code + "\n");
  process.exit(1);
}

function parseArgs(argv) {
  const out = { apply: false, sha: "" };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--apply") out.apply = true;
    if (argv[i] === "--sha") out.sha = String(argv[i + 1] || "").toLowerCase();
  }
  return out;
}

async function renderJson(method, path, body) {
  const key = process.env.RENDER_API_KEY;
  if (!key) fail("render_api_key_missing");
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    fail("render_response_not_json_" + res.status);
  }
  if (!res.ok) {
    process.stderr.write(
      "[apply-live-api-promotion] http=" +
        res.status +
        " path=" +
        path +
        "\n",
    );
    fail("render_http_" + res.status);
  }
  return json;
}

function publicService(service) {
  return {
    id: service.id,
    name: service.name,
    type: service.type,
    repo: service.repo,
    branch: service.branch,
    autoDeploy: service.autoDeploy,
    updatedAt: service.updatedAt,
    url:
      service.serviceDetails && service.serviceDetails.url
        ? service.serviceDetails.url
        : service.url || "",
    environmentId: service.environmentId || service.environment_id || "",
  };
}

function publicDeploy(row) {
  const d = row && row.deploy ? row.deploy : row;
  const commit = d && d.commit && typeof d.commit === "object" ? d.commit : {};
  return {
    id: d && d.id,
    status: d && d.status,
    commitId: commit.id || "",
    createdAt: d && d.createdAt,
    finishedAt: d && d.finishedAt,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const service = await renderJson("GET", "/services/" + SERVICE_ID);
  const snap = publicService(service);
  if (snap.id !== LAST_CONFIRMED_PRODUCTION_RENDER.service_id) {
    fail("service_id_mismatch");
  }
  if (snap.name !== LAST_CONFIRMED_PRODUCTION_RENDER.name) {
    fail("service_name_mismatch");
  }
  if (String(snap.branch || "") !== "main") fail("service_branch_not_main");
  const deploys = await renderJson(
    "GET",
    "/services/" + SERVICE_ID + "/deploys?limit=5",
  );
  const live = Array.isArray(deploys) ? deploys.map(publicDeploy) : [];
  const out = {
    schema: "apply-live-api-promotion.v1",
    mutation: args.apply ? 1 : 0,
    service: snap,
    recent: live,
  };
  if (!args.apply) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
    process.exit(0);
  }
  if (!/^[0-9a-f]{40}$/.test(args.sha)) fail("sha_invalid");
  const created = await renderJson(
    "POST",
    "/services/" + SERVICE_ID + "/deploys",
    { commitId: args.sha, clearCache: "do_not_clear" },
  );
  out.created = publicDeploy(created);
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write("[apply-live-api-promotion] " + err.message + "\n");
  process.exit(1);
});
