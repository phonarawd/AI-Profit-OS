"use strict";

const { ACCOUNT_ID, APP_NAME, HOST, TOKEN_NAME, assertHostAllowed, cf } = require("./cf-access-j0-cf.cjs");

async function resolveAppAndToken() {
  if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error("CLOUDFLARE_API_TOKEN missing");
  assertHostAllowed(HOST);
  const org = await cf("GET", "/accounts/" + ACCOUNT_ID + "/access/organizations");
  const authDomain = org && (org.auth_domain || org.name);
  if (!authDomain) throw new Error("access organization auth_domain missing");
  const teamOrigin = "https://" + String(authDomain).replace(/^https?:\/\//, "");
  const apps = (await cf("GET", "/accounts/" + ACCOUNT_ID + "/access/apps")) || [];
  const existing = (Array.isArray(apps) ? apps : []).find(
    (app) => app && (app.name === APP_NAME || app.domain === HOST),
  );
  if (!existing) throw new Error("Access app missing; run cf:access:dedicated first");
  assertHostAllowed(existing.domain || HOST);
  return { existing, teamOrigin };
}

module.exports = { resolveAppAndToken };
