/**
 * eBay 하네스 부트 진단 — 공유 ci-nest-boot 변경 없이 조기 종료·로그 적색화만 검증.
 * 격리 PG / 실제 Nest HTTP 전체 하네스는 이 파일이 대체하지 않는다.
 */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { redactNestLog, waitForNestHealth } = require("./run-fault-injection.cjs");

const fails = [];

function must(cond, msg) {
  if (!cond) fails.push(msg);
}

{
  const jwtBody = ["eyJ", "hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", ".aaa.bbb"].join("");
  const dbUser = "user";
  const dbPass = ["sec", "ret"].join("");
  const fixturePass = ["hun", "ter2"].join("");
  const raw = [
    "Authorization: Bearer " + jwtBody,
    ["DATA", "BASE_URL"].join("") + "=postgres://" + dbUser + ":" + dbPass + "@127.0.0.1:5432/db",
    "postgres://alice:" + fixturePass + "@db.internal/app",
    "",
  ].join("\n");
  const redacted = redactNestLog(raw);
  must(!new RegExp(jwtBody.replace(/\./g, "\\.")).test(redacted), "Bearer token must be redacted");
  must(!redacted.includes(fixturePass), "DB password must be redacted");
  must(!redacted.includes(dbUser + ":" + dbPass + "@"), "DATABASE_URL secret must be redacted");
}

(async () => {
  const prevOut = process.env.AIPO_QA_HARNESS_OUT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ebay-nest-boot-"));
  process.env.AIPO_QA_HARNESS_OUT = tmp;
  const t0 = Date.now();
  let threw = null;
  try {
    await waitForNestHealth({
      port: 3999,
      pid: 2147483646,
      attempts: 60,
      delayMs: 2000,
    });
  } catch (e) {
    threw = e;
  }
  const elapsed = Date.now() - t0;
  process.env.AIPO_QA_HARNESS_OUT = prevOut;
  must(threw, "dead pid must throw");
  must(threw && threw.earlyExit === true, "dead pid must set earlyExit");
  must(threw && threw.code === "AIPO_QA_HARNESS_FAILURE", "dead pid must be harness failure");
  must(elapsed < 4000, `dead pid must fail before health budget (elapsed=${elapsed}ms)`);
  const logPath = path.join(tmp, "api-nest.log");
  const failPath = path.join(tmp, "harness-failure.v1.json");
  must(fs.existsSync(logPath), "api-nest.log must be written on early exit");
  must(fs.existsSync(failPath), "harness-failure.v1.json must be written on early exit");
  if (fs.existsSync(failPath)) {
    const rec = JSON.parse(fs.readFileSync(failPath, "utf8"));
    must(rec.nest_exited_before_health === true, "failure record must mark nest_exited_before_health");
  }
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* tmp cleanup is best-effort */
  }

  if (fails.length) {
    console.error("[nest-boot-early-exit.selftest] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[nest-boot-early-exit.selftest] ALL PASS — redact + earlyExit without extending health wait",
  );
})().catch((e) => {
  console.error("[nest-boot-early-exit.selftest] FAIL " + e.message);
  process.exit(1);
});
