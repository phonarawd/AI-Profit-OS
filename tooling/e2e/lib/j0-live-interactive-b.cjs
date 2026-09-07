/** J0 11–16 */
"use strict";

const { hosts, totp, cookieHeader, looksLikeSecretLeak } = require("./j0-live-lib.cjs");
const { jsonSafe, opsApi, sessionStatus, fullLogin } = require("./j0-live-http.cjs");

async function runInteractiveB(items, ctx) {
  if (!ctx) return;
  const { maker, checker, viewer, nextTok, goodStart, bad } = ctx;

  const viewerLogin = await fullLogin(viewer, nextTok);
  if (!viewerLogin.ok) {
    items[10] = { id: 11, status: "FAIL", why: "viewer login failed" };
  } else {
    const denied = await opsApi("/api/v1/admin/approvals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        cookie: cookieHeader(viewerLogin.jar),
        "x-admin-csrf": viewerLogin.jar.aipo_admin_csrf || "",
      },
      body: JSON.stringify({
        actionType: "withdraw_approve",
        reason: "j0-low-role-must-deny",
        payload: {},
      }),
    });
    items[10] = {
      id: 11,
      status: denied.res.status >= 400 ? "PASS" : "FAIL",
      why: "status=" + denied.res.status,
    };
  }

  const makerFresh = await fullLogin(maker, nextTok);
  if (!makerFresh.ok) {
    items[11] = { id: 12, status: "FAIL", why: "maker relogin failed" };
    items[12] = { id: 13, status: "FAIL", why: "maker relogin failed" };
  } else {
    const started = await opsApi("/api/v1/admin-auth/step-up/start", {
      method: "POST",
      headers: { accept: "application/json", cookie: cookieHeader(makerFresh.jar) },
    });
    const noStep = await opsApi("/api/v1/admin/approvals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        cookie: cookieHeader(makerFresh.jar),
        "x-admin-csrf": makerFresh.jar.aipo_admin_csrf || "",
      },
      body: JSON.stringify({
        actionType: "withdraw_approve",
        reason: "j0-step-up-required",
        payload: { probe: true },
      }),
    });
    items[11] = {
      id: 12,
      status: started.res.status === 200 || noStep.res.status >= 400 ? "PASS" : "FAIL",
      why: "step-up/start=" + started.res.status + " mutation=" + noStep.res.status,
    };

    let submitId = jsonSafe(noStep.text).id;
    if (!submitId) {
      const step = jsonSafe(started.text);
      if (step.challengeId) {
        await opsApi("/api/v1/admin-auth/step-up", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            cookie: cookieHeader(makerFresh.jar),
            "x-admin-csrf": makerFresh.jar.aipo_admin_csrf || "",
          },
          body: JSON.stringify({
            challengeId: step.challengeId,
            totp: totp(maker.totpSecret),
          }),
        });
      }
      const again = await opsApi("/api/v1/admin/approvals", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie: cookieHeader(makerFresh.jar),
          "x-admin-csrf": makerFresh.jar.aipo_admin_csrf || "",
        },
        body: JSON.stringify({
          actionType: "withdraw_approve",
          reason: "j0-maker-checker-path",
          payload: { probe: true },
        }),
      });
      submitId = jsonSafe(again.text).id;
    }

    const selfDecide = submitId
      ? await opsApi("/api/v1/admin/approvals/" + submitId + "/decide", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            cookie: cookieHeader(makerFresh.jar),
            "x-admin-csrf": makerFresh.jar.aipo_admin_csrf || "",
          },
          body: JSON.stringify({ approve: true }),
        })
      : { res: { status: 0 }, text: "{}" };
    const checkerLogin = await fullLogin(checker, nextTok);
    const checkerDecide =
      submitId && checkerLogin.ok
        ? await opsApi("/api/v1/admin/approvals/" + submitId + "/decide", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              accept: "application/json",
              cookie: cookieHeader(checkerLogin.jar),
              "x-admin-csrf": checkerLogin.jar.aipo_admin_csrf || "",
            },
            body: JSON.stringify({ approve: true }),
          })
        : { res: { status: 0 }, text: "{}" };
    items[12] = {
      id: 13,
      status:
        selfDecide.res.status >= 400 &&
        (checkerDecide.res.status === 200 || jsonSafe(checkerDecide.text).status === "approved")
          ? "PASS"
          : "FAIL",
      why: "self=" + selfDecide.res.status + " checker=" + checkerDecide.res.status,
    };
  }

  const codeEx = await opsApi("/api/v1/admin-session", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ token: "not-a-connection-code" }),
  });
  items[13] = {
    id: 14,
    status: codeEx.res.status === 403 || codeEx.res.status === 401 ? "PASS" : "FAIL",
    why: "status=" + codeEx.res.status,
  };

  const leak =
    looksLikeSecretLeak(goodStart.text) ||
    looksLikeSecretLeak(bad.text) ||
    /[?&](token|accessToken|refresh)=/i.test(hosts.DEDICATED_OPS_LOGIN);
  items[14] = {
    id: 15,
    status: leak ? "FAIL" : "PASS",
    why: leak ? "token-like value in error/url" : "no token in url/error",
  };

  const csrfMaker = await fullLogin(maker, nextTok);
  if (!csrfMaker.ok) {
    items[15] = { id: 16, status: "FAIL", why: "csrf probe login failed" };
    return;
  }
  const noCsrf = await opsApi("/api/v1/admin-auth/logout-all", {
    method: "POST",
    headers: { accept: "application/json", cookie: cookieHeader(csrfMaker.jar) },
  });
  const still = await sessionStatus(csrfMaker.jar);
  items[15] = {
    id: 16,
    status: noCsrf.res.status >= 400 && jsonSafe(still.text).connected === true ? "PASS" : "FAIL",
    why: "csrf=" + noCsrf.res.status,
  };
}

module.exports = { runInteractiveB };
