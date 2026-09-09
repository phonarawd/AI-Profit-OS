/** J0 17–20. Access / production origin / machine token. */
"use strict";

const { hosts, hasAccessServiceToken, fetchRaw, parseSetCookies } = require("./j0-live-lib.cjs");
const { jsonSafe, isAccessRedirect, fetchNoAccess, opsApi } = require("./j0-live-http.cjs");

async function runEdge(items) {
  const noTok = await fetchNoAccess(hosts.DEDICATED_OPS + "/admin/login", {
    headers: { accept: "text/html" },
  });
  items[16] = {
    id: 17,
    status: isAccessRedirect(noTok.res) ? "PASS" : "FAIL",
    why: "status=" + noTok.res.status,
  };

  const prodLogin = await fetchNoAccess(hosts.PRODUCTION_API + "/api/v1/admin-auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      identifier: "founder.ops",
      password: "not-a-real-password",
      turnstileToken: "not-a-turnstile",
    }),
  });
  const prodCookies = parseSetCookies(prodLogin.res);
  const minted =
    Boolean(prodCookies.aipo_admin_session) ||
    jsonSafe(prodLogin.text).connected === true ||
    jsonSafe(prodLogin.text).next === "mfa";
  items[17] = {
    id: 18,
    status: minted ? "FAIL" : "PASS",
    why: minted
      ? "production origin minted admin session"
      : "production/direct origin did not mint human admin session",
  };

  const machine = await opsApi("/api/v1/admin-auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: "Bearer machine-internal",
    },
    body: JSON.stringify({}),
  });
  const machineJar = parseSetCookies(machine.res);
  items[18] = {
    id: 19,
    status:
      machine.res.status >= 400 &&
      !machineJar.aipo_admin_session &&
      jsonSafe(machine.text).connected !== true
        ? "PASS"
        : "FAIL",
    why: "status=" + machine.res.status,
  };

  const withTok = await fetchRaw(hosts.DEDICATED_OPS + "/admin/login", {
    headers: { accept: "text/html" },
  });
  items[19] = {
    id: 20,
    status: !isAccessRedirect(withTok.res) && withTok.res.status === 200 ? "PASS" : "FAIL",
    why: hasAccessServiceToken()
      ? "service token reaches origin login"
      : "CF_ACCESS_CLIENT_* missing",
  };
}

module.exports = { runEdge };
