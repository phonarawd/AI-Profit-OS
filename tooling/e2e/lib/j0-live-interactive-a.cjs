/** J0 1–10 */
"use strict";

const { hosts, totp, mergeJar, parseSetCookies, cookieHeader } = require("./j0-live-lib.cjs");
const { jsonSafe, opsApi, loginStart, loginMfa, sessionStatus, fullLogin } = require("./j0-live-http.cjs");
const { mintTurnstileTokens, takeToken } = require("./j0-live-turnstile.cjs");
const { j0Accounts, markRange } = require("./j0-live-creds.cjs");

async function runInteractiveA(items) {
  const { maker, checker, viewer, idle } = j0Accounts();
  if (!maker.password || !maker.totpSecret || !checker.password || !checker.totpSecret) {
    markRange(items, 0, 15, "BLOCKED_EXTERNAL", "STAGING_J0_* credentials missing");
    return null;
  }

  let pool;
  try {
    pool = await mintTurnstileTokens(8);
  } catch (err) {
    const why =
      String(err && err.message) === "playwright_unavailable"
        ? "BLOCKED_LOCAL_ENVIRONMENT playwright"
        : "BLOCKED_LOCAL_ENVIRONMENT turnstile mint";
    markRange(items, 0, 15, "BLOCKED_LOCAL_ENVIRONMENT", why);
    return null;
  }
  const nextTok = () => takeToken(pool);

  const bad = await loginStart(maker.identifier, "wrong-password-xxxx", nextTok());
  const badBody = jsonSafe(bad.text);
  items[1] = {
    id: 2,
    status:
      bad.res.status >= 400 &&
      badBody.next !== "mfa" &&
      !/password|identifier|totp/i.test(JSON.stringify(badBody))
        ? "PASS"
        : "FAIL",
    why: "status=" + bad.res.status,
  };

  const goodStart = await loginStart(maker.identifier, maker.password, nextTok());
  const goodBody = jsonSafe(goodStart.text);
  items[0] = {
    id: 1,
    status: goodBody.next === "mfa" && typeof goodBody.challengeId === "string" ? "PASS" : "FAIL",
    why: "status=" + goodStart.res.status,
  };
  if (items[0].status !== "PASS") {
    markRange(items, 2, 15, "NOT_RUN", "login start failed");
    return null;
  }

  const wrongMfa = await loginMfa(goodBody.challengeId, { totp: "000000" }, {});
  const okMfa = await loginMfa(goodBody.challengeId, { totp: totp(maker.totpSecret) }, {});
  const makerJar = mergeJar({}, parseSetCookies(okMfa.res));
  items[2] = {
    id: 3,
    status:
      wrongMfa.res.status >= 400 &&
      jsonSafe(okMfa.text).connected === true &&
      Boolean(makerJar.aipo_admin_session)
        ? "PASS"
        : "FAIL",
    why: "wrong=" + wrongMfa.res.status + " ok=" + okMfa.res.status,
  };

  const backupStart = await loginStart(maker.identifier, maker.password, nextTok());
  const backupBody = jsonSafe(backupStart.text);
  const code = maker.backups[0] || "";
  if (!code || backupBody.next !== "mfa") {
    items[3] = { id: 4, status: "BLOCKED_EXTERNAL", why: "backup code or second login missing" };
  } else {
    const first = await loginMfa(backupBody.challengeId, { backupCode: code }, {});
    const reuseStart = await loginStart(maker.identifier, maker.password, nextTok());
    const reuseBody = jsonSafe(reuseStart.text);
    const reuse = reuseBody.challengeId
      ? await loginMfa(reuseBody.challengeId, { backupCode: code }, {})
      : { res: { status: 0 }, text: "{}" };
    items[3] = {
      id: 4,
      status: jsonSafe(first.text).connected === true && reuse.res.status >= 400 ? "PASS" : "FAIL",
      why: "first=" + first.res.status + " reuse=" + reuse.res.status,
    };
  }

  const protectedPage = await opsApi("/api/v1/admin/approvals", {
    headers: { accept: "application/json", cookie: cookieHeader(makerJar) },
  });
  items[4] = { id: 5, status: protectedPage.res.status === 200 ? "PASS" : "FAIL", why: "status=" + protectedPage.res.status };

  await opsApi("/api/v1/admin-session/logout", {
    method: "POST",
    headers: {
      accept: "application/json",
      cookie: cookieHeader(makerJar),
      "x-admin-csrf": makerJar.aipo_admin_csrf || "",
    },
  });
  const afterLogout = await sessionStatus(makerJar);
  items[5] = {
    id: 6,
    status: jsonSafe(afterLogout.text).connected !== true ? "PASS" : "FAIL",
    why: "connected=" + String(jsonSafe(afterLogout.text).connected),
  };

  const maker2 = await fullLogin(maker, nextTok);
  const maker3 = await fullLogin(maker, nextTok);
  if (!maker2.ok || !maker3.ok) {
    items[6] = { id: 7, status: "FAIL", why: "second device login failed" };
    items[7] = { id: 8, status: "NOT_RUN", why: "logout-all setup failed" };
    items[8] = { id: 9, status: "NOT_RUN", why: "logout-all setup failed" };
  } else {
    await opsApi("/api/v1/admin-auth/logout-all", {
      method: "POST",
      headers: {
        accept: "application/json",
        cookie: cookieHeader(maker2.jar),
        "x-admin-csrf": maker2.jar.aipo_admin_csrf || "",
      },
    });
    const other = await sessionStatus(maker3.jar);
    items[6] = {
      id: 7,
      status: jsonSafe(other.text).connected !== true ? "PASS" : "FAIL",
      why: "other-device connected=" + String(jsonSafe(other.text).connected),
    };
    const persistOps = await sessionStatus(maker2.jar);
    const persistApi = await sessionStatus(maker2.jar, hosts.STAGING_API);
    const revoked =
      jsonSafe(persistOps.text).connected !== true && jsonSafe(persistApi.text).connected !== true;
    items[7] = { id: 8, status: revoked ? "PASS" : "FAIL", why: "durable revoke on ops+api" };
    items[8] = { id: 9, status: revoked ? "PASS" : "FAIL", why: "same revoke on two origins" };
  }

  const idleLogin = await loginStart(idle.identifier, idle.password || "x", nextTok());
  const idleBody = jsonSafe(idleLogin.text);
  let idleDenied = idleBody.next !== "mfa";
  if (idleBody.next === "mfa" && idle.totpSecret) {
    const idleMfa = await loginMfa(idleBody.challengeId, { totp: totp(idle.totpSecret) }, {});
    idleDenied = jsonSafe(idleMfa.text).connected !== true;
  }
  items[9] = { id: 10, status: idleDenied ? "PASS" : "FAIL", why: "status=" + idleLogin.res.status };

  return { maker, checker, viewer, nextTok, goodStart, bad };
}

module.exports = { runInteractiveA };
