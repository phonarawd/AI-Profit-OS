"use strict";

const http = require("http");
const path = require("path");
const { URL } = require("url");
const core = require(path.join(__dirname, "member-daily-cap.core.cjs"));

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CAP_PATH = "users/:id/membership/daily-match-cap";

const store = {
  [USER_A]: {
    rowCap: 8,
    overrideCap: null,
    used: 0,
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    matchStrictness: "standard",
  },
  [USER_B]: {
    rowCap: 8,
    overrideCap: null,
    used: 1,
    minProfitUsdt: "5",
    staleAllowanceSec: 3,
    matchStrictness: "standard",
  },
};

function quotaOf(userId) {
  const u = store[userId];
  if (!u) return null;
  return core.projectDailyMatchQuota({
    userId,
    used: u.used,
    overrideDailyUserMatchCap: u.overrideCap,
    membershipRowCap: u.rowCap,
    ladderCap: 8,
  });
}

function putCap(userId, body) {
  const u = store[userId];
  if (!u) return { status: 404, json: { code: "USER_NOT_FOUND" } };
  if (!body || typeof body !== "object") {
    return { status: 400, json: { code: "INVALID_BODY" } };
  }
  if (typeof body.reason !== "string" || body.reason.trim().length < 10) {
    return { status: 400, json: { code: "REASON_REQUIRED" } };
  }
  if (body.clear === true) {
    u.overrideCap = null;
    return {
      status: 200,
      json: {
        cleared: true,
        quota: quotaOf(userId),
        quality: {
          minProfitUsdt: u.minProfitUsdt,
          staleAllowanceSec: u.staleAllowanceSec,
          matchStrictness: u.matchStrictness,
        },
        ledgerMutated: false,
      },
    };
  }
  let cap;
  try {
    cap = core.assertMemberDailyMatchCap(body.dailyUserMatchCap);
  } catch (e) {
    return { status: 400, json: { code: e.code || "INVALID_CAP" } };
  }
  u.overrideCap = cap;
  return {
    status: 200,
    json: {
      override: { dailyUserMatchCap: cap, capOnly: true },
      quota: quotaOf(userId),
      quality: {
        minProfitUsdt: u.minProfitUsdt,
        staleAllowanceSec: u.staleAllowanceSec,
        matchStrictness: u.matchStrictness,
      },
      qualityUntouched: true,
      ledgerMutated: false,
    },
  };
}

function participateGuard(userId) {
  const u = store[userId];
  if (!u) return { status: 404, json: { code: "USER_NOT_FOUND" } };
  const decision = core.decideMemberParticipate({
    userId,
    used: u.used,
    overrideDailyUserMatchCap: u.overrideCap,
    membershipRowCap: u.rowCap,
    ladderCap: 8,
    slotsLeft: 2,
  });
  if (!decision.allowed) {
    return {
      status: 403,
      json: {
        code: decision.deny.code,
        message: decision.deny.message,
        quota: decision.quota,
      },
    };
  }
  return { status: 200, json: { ok: true, quota: decision.quota } };
}

function route(req, body) {
  const url = new URL(req.url, "http://127.0.0.1");
  const capPut = url.pathname.match(
    /^\/api\/v1\/admin\/users\/([^/]+)\/membership\/daily-match-cap$/,
  );
  const preview = url.pathname.match(
    /^\/api\/v1\/admin\/users\/([^/]+)\/membership\/effective-preview$/,
  );
  const participate = url.pathname.match(
    /^\/api\/v1\/opportunities\/[^/]+\/participate$/,
  );

  if (capPut && req.method === "PUT") return putCap(capPut[1], body);
  if (capPut && req.method === "GET") {
    const q = quotaOf(capPut[1]);
    if (!q) return { status: 404, json: { code: "USER_NOT_FOUND" } };
    const u = store[capPut[1]];
    return {
      status: 200,
      json: {
        quota: q,
        quality: {
          minProfitUsdt: u.minProfitUsdt,
          staleAllowanceSec: u.staleAllowanceSec,
          matchStrictness: u.matchStrictness,
        },
      },
    };
  }
  if (preview && req.method === "GET") {
    const q = quotaOf(preview[1]);
    if (!q) return { status: 404, json: { code: "USER_NOT_FOUND" } };
    const u = store[preview[1]];
    return {
      status: 200,
      json: {
        quota: q,
        effectivePolicy: {
          minProfitUsdt: u.minProfitUsdt,
          staleAllowanceSec: u.staleAllowanceSec,
          matchStrictness: u.matchStrictness,
          dailyUserMatchCap: q.cap,
        },
      },
    };
  }
  if (participate && req.method === "POST") {
    return participateGuard(String((body && body.userId) || ""));
  }
  return { status: 404, json: { code: "NO_ROUTE" } };
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        let body = null;
        if (chunks.length) {
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ code: "INVALID_JSON" }));
            return;
          }
        }
        const out = route(req, body);
        res.writeHead(out.status, { "content-type": "application/json" });
        res.end(JSON.stringify(out.json));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: urlPath,
        headers: { "content-type": "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, json });
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const fails = [];
  function check(cond, msg) {
    if (!cond) fails.push(msg);
  }

  check(CAP_PATH === "users/:id/membership/daily-match-cap", "route constant");

  const { server, port } = await startServer();
  try {
    const put0 = await request(
      port,
      "PUT",
      `/api/v1/admin/users/${USER_A}/membership/daily-match-cap`,
      {
        dailyUserMatchCap: 0,
        reason: "block member A new participate",
        updatedByAdminId: ADMIN,
      },
    );
    check(put0.status === 200, "PUT 0 status 200");
    check(put0.json.quota && put0.json.quota.cap === 0, "PUT 0 cap");
    check(put0.json.quota.blocked === true, "PUT 0 blocked");
    check(put0.json.quality.minProfitUsdt === "5", "PUT 0 quality");
    check(put0.json.qualityUntouched === true, "qualityUntouched");

    const denyA = await request(
      port,
      "POST",
      "/api/v1/opportunities/00000000-0000-4000-8000-000000000001/participate",
      { userId: USER_A },
    );
    check(denyA.status === 403, "A participate 403");
    check(denyA.json.code === "DAILY_MATCH_CAP", "A DAILY_MATCH_CAP");

    const allowB = await request(
      port,
      "POST",
      "/api/v1/opportunities/00000000-0000-4000-8000-000000000001/participate",
      { userId: USER_B },
    );
    check(allowB.status === 200, "B participate 200");
    check(allowB.json.ok === true, "B allowed");

    const bad = await request(
      port,
      "PUT",
      `/api/v1/admin/users/${USER_B}/membership/daily-match-cap`,
      {
        dailyUserMatchCap: -1,
        reason: "negative cap must be rejected",
        updatedByAdminId: ADMIN,
      },
    );
    check(bad.status === 400, "invalid cap 400");

    const putB = await request(
      port,
      "PUT",
      `/api/v1/admin/users/${USER_B}/membership/daily-match-cap`,
      {
        dailyUserMatchCap: 1,
        reason: "set member B cap to one",
        updatedByAdminId: ADMIN,
      },
    );
    check(putB.status === 200 && putB.json.quota.cap === 1, "B cap 1");
    check(putB.json.quota.used === 1, "B used stays 1");
    check(putB.json.quota.remaining === 0, "B remaining 0");
    check(putB.json.quality.minProfitUsdt === "5", "B quality unchanged");

    const denyB = await request(
      port,
      "POST",
      "/api/v1/opportunities/00000000-0000-4000-8000-000000000001/participate",
      { userId: USER_B },
    );
    check(denyB.status === 403, "B blocked at used=cap");

    const preview = await request(
      port,
      "GET",
      `/api/v1/admin/users/${USER_A}/membership/effective-preview`,
    );
    check(preview.status === 200, "preview 200");
    check(preview.json.quota.cap === 0, "preview cap 0");
    check(preview.json.effectivePolicy.minProfitUsdt === "5", "preview quality");
  } finally {
    await new Promise((r) => server.close(r));
  }

  if (fails.length) {
    console.error("[member-daily-cap.http] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[member-daily-cap.http] PASS");
}

main().catch((err) => {
  console.error("[member-daily-cap.http] FAIL", err);
  process.exit(1);
});
