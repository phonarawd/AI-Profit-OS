/** J0 HTTP 호출. 비밀 출력 금지. */
"use strict";

const {
  hosts,
  fetchRaw,
  parseSetCookies,
  mergeJar,
  cookieHeader,
  totp,
} = require("./j0-live-lib.cjs");

function jsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function locationOf(res) {
  return String(res.headers.get("location") || "");
}

function isAccessRedirect(res) {
  const loc = locationOf(res);
  return (
    (res.status === 302 || res.status === 301 || res.status === 303) &&
    /cloudflareaccess\.com|\/cdn-cgi\/access\//i.test(loc)
  );
}

async function fetchNoAccess(url, init) {
  const res = await fetch(url, Object.assign({ redirect: "manual" }, init));
  const text = await res.text();
  return { res, text };
}

function opsApi(pathname, init) {
  return fetchRaw(hosts.DEDICATED_OPS + pathname, init);
}

function loginStart(identifier, password, turnstileToken) {
  return opsApi("/api/v1/admin-auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ identifier, account: identifier, password, turnstileToken }),
  });
}

function loginMfa(challengeId, fields, jar) {
  return opsApi("/api/v1/admin-auth/mfa", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      cookie: cookieHeader(jar),
    },
    body: JSON.stringify(Object.assign({ challengeId }, fields)),
  });
}

function sessionStatus(jar, origin) {
  const base = origin || hosts.DEDICATED_OPS;
  return fetchRaw(base + "/api/v1/admin-session", {
    headers: { accept: "application/json", cookie: cookieHeader(jar) },
  });
}

async function fullLogin(cred, takeToken) {
  const start = await loginStart(cred.identifier, cred.password, takeToken());
  const body = jsonSafe(start.text);
  if (body.next !== "mfa" || typeof body.challengeId !== "string") {
    return { ok: false, start, body };
  }
  const mfa = await loginMfa(body.challengeId, { totp: totp(cred.totpSecret) }, {});
  const mfaBody = jsonSafe(mfa.text);
  const jar = mergeJar({}, parseSetCookies(mfa.res));
  return {
    ok: mfaBody.connected === true && Boolean(jar.aipo_admin_session),
    start,
    mfa,
    body: mfaBody,
    jar,
    challengeId: body.challengeId,
  };
}

module.exports = {
  jsonSafe,
  locationOf,
  isAccessRedirect,
  fetchNoAccess,
  opsApi,
  loginStart,
  loginMfa,
  sessionStatus,
  fullLogin,
};
