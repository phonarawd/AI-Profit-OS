"use strict";

const fs = require("fs");
const path = require("path");
const { root } = require("./env.cjs");
const { FORBIDDEN_ACCESS_HOSTS } = require("../../e2e/lib/j0-live-hosts.cjs");

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "190a1476a068cfe96dfe1029877587ef";
const APP_NAME = "ai-profit-ops-dedicated-j0";
const HOST = "ai-profit-ops-dedicated.ebay-adapter.workers.dev";
const TOKEN_NAME = "putduk-j0-live";

function emailsFromEnv() {
  return String(process.env.STAGING_ACCESS_ALLOWED_EMAILS || "")
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x && x.includes("@"));
}

function upsertEnv(pairs) {
  const envPath = path.join(root, ".env");
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (text && !text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(pairs)) {
    const line = key + "=" + value;
    const re = new RegExp("^" + key + "=.*$", "m");
    if (re.test(text)) text = text.replace(re, () => line);
    else text += line + "\n";
  }
  fs.writeFileSync(envPath, text);
}

function assertHostAllowed(host) {
  const lower = String(host || "").toLowerCase();
  for (const banned of FORBIDDEN_ACCESS_HOSTS) {
    if (lower.includes(banned)) throw new Error("refused: Access host forbidden");
  }
}

async function cf(method, urlPath, body) {
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  const res = await fetch("https://api.cloudflare.com/client/v4" + urlPath, {
    method,
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = (json.errors && json.errors[0] && json.errors[0].message) || res.status;
    throw new Error(String(err));
  }
  return json.result;
}

module.exports = {
  ACCOUNT_ID,
  APP_NAME,
  HOST,
  TOKEN_NAME,
  emailsFromEnv,
  upsertEnv,
  assertHostAllowed,
  cf,
};
