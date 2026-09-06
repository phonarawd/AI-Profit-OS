#!/usr/bin/env node
/**
 * S5 dedicated ops Cloudflare Access 앱 보장.
 * allow-all 금지. 이메일이 없으면 deny-everyone 정책만 만든다.
 * AUD/이메일을 커밋하지 않는다.
 */
"use strict";

const { loadDotEnv } = require("./lib/env.cjs");

loadDotEnv();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "190a1476a068cfe96dfe1029877587ef";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const APP_NAME = "ai-profit-ops-dedicated-j0";
const HOST = "ai-profit-ops-dedicated.ebay-adapter.workers.dev";

function emailsFromEnv() {
  return String(process.env.STAGING_ACCESS_ALLOWED_EMAILS || "")
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x && x.includes("@"));
}

async function cf(method, urlPath, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
    method,
    headers: {
      authorization: "Bearer " + TOKEN,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = (json.errors && json.errors[0] && json.errors[0].message) || res.status;
    throw new Error(String(err));
  }
  return json.result;
}

function policyFor(emails) {
  if (emails.length) {
    return {
      name: "s5-dedicated-allow-listed",
      decision: "allow",
      include: emails.map((email) => ({ email: { email } })),
    };
  }
  return {
    name: "s5-dedicated-deny-until-emails",
    decision: "deny",
    include: [{ everyone: {} }],
  };
}

(async function main() {
  if (!TOKEN) {
    console.error("[cf-access-dedicated] BLOCKED_EXTERNAL: CLOUDFLARE_API_TOKEN missing");
    process.exit(2);
  }

  const org = await cf("GET", `/accounts/${ACCOUNT_ID}/access/organizations`);
  const authDomain = org && (org.auth_domain || org.name);
  if (!authDomain) {
    console.error("[cf-access-dedicated] FAIL: access organization auth_domain missing");
    process.exit(1);
  }
  const teamOrigin = "https://" + String(authDomain).replace(/^https?:\/\//, "");

  const apps = (await cf("GET", `/accounts/${ACCOUNT_ID}/access/apps`)) || [];
  const existing = (Array.isArray(apps) ? apps : apps.result || []).find(
    (app) => app && (app.name === APP_NAME || (app.domain || "") === HOST),
  );

  const emails = emailsFromEnv();
  const payload = {
    type: "self_hosted",
    name: APP_NAME,
    domain: HOST,
    session_duration: "24h",
    auto_redirect_to_identity: true,
    policies: [policyFor(emails)],
  };

  const app = existing
    ? await cf("PUT", `/accounts/${ACCOUNT_ID}/access/apps/${existing.id}`, payload)
    : await cf("POST", `/accounts/${ACCOUNT_ID}/access/apps`, payload);

  const aud = app && (app.aud || (Array.isArray(app.aud) ? app.aud[0] : ""));
  if (!aud) {
    console.error("[cf-access-dedicated] FAIL: application aud missing");
    process.exit(1);
  }

  const audValue = Array.isArray(aud) ? aud[0] : aud;
  process.env.CF_ACCESS_TEAM_DOMAIN = teamOrigin;
  process.env.CF_ACCESS_AUD = audValue;

  if (process.env.WRITE_DEDICATED_ACCESS_SECRETS === "1") {
    const script = "ai-profit-ops-dedicated";
    await cf("PUT", `/accounts/${ACCOUNT_ID}/workers/scripts/${script}/secrets`, {
      name: "CF_ACCESS_TEAM_DOMAIN",
      text: teamOrigin,
      type: "secret_text",
    });
    await cf("PUT", `/accounts/${ACCOUNT_ID}/workers/scripts/${script}/secrets`, {
      name: "CF_ACCESS_AUD",
      text: audValue,
      type: "secret_text",
    });
    console.log("wrangler_secrets=1");
  }

  console.log("[cf-access-dedicated] PASS");
  console.log("app=" + (existing ? "updated" : "created"));
  console.log("host=" + HOST);
  console.log("team_set=1");
  console.log("aud_set=1");
  console.log("email_rules=" + emails.length);
  console.log("TEAM_DOMAIN=" + teamOrigin);
  // AUD는 표준출력에 쓰지 않는다.
})().catch((err) => {
  const msg = String(err && err.message ? err.message : err);
  const blocked =
    /authentication error/i.test(msg) ||
    /unauthorized/i.test(msg) ||
    /permission/i.test(msg);
  console.error(
    "[cf-access-dedicated] " +
      (blocked ? "BLOCKED_EXTERNAL" : "FAIL") +
      ": " +
      msg,
  );
  process.exit(blocked ? 2 : 1);
});
