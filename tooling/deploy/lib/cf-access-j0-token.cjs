"use strict";

const { ACCOUNT_ID, TOKEN_NAME, cf } = require("./cf-access-j0-cf.cjs");

async function resolveServiceToken() {
  let tokens = (await cf("GET", "/accounts/" + ACCOUNT_ID + "/access/service_tokens")) || [];
  if (!Array.isArray(tokens)) tokens = [];
  let svc = tokens.find((t) => t && t.name === TOKEN_NAME);
  let clientId = String(process.env.CF_ACCESS_CLIENT_ID || "").trim();
  let clientSecret = String(process.env.CF_ACCESS_CLIENT_SECRET || "").trim();
  if (!svc) {
    svc = await cf("POST", "/accounts/" + ACCOUNT_ID + "/access/service_tokens", { name: TOKEN_NAME });
    clientId = svc.client_id || svc.id;
    clientSecret = svc.client_secret || clientSecret;
  }
  if (!clientId || !clientSecret) throw new Error("CF_ACCESS_CLIENT_* missing");
  return { svc, clientId, clientSecret };
}

module.exports = { resolveServiceToken };
