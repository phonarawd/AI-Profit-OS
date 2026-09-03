"use strict";

const fs = require("node:fs");
const { chromium } = require("@playwright/test");

const manifest = JSON.parse(fs.readFileSync("infra/domain.manifest.json", "utf8"));
const binding = JSON.parse(
  fs.readFileSync("governance/recovery/staging-runtime-db-binding.20260903.v1.json", "utf8"),
);

const web = "https://" + manifest.openNext.staging.web.workersDev;
const ops = "https://" + manifest.openNext.staging.ops.workersDev;
const expectedSha = binding.candidate_sha;

async function assertHealth(page, label) {
  const result = await page.evaluate(async () => {
    const res = await fetch("/api/v1/health", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    let body = null;
    try {
      body = await res.json();
    } catch {}
    return { status: res.status, body };
  });
  if (result.status !== 200) {
    throw new Error(label + "_health_status_" + result.status);
  }
  if (!result.body || result.body.gitSha !== expectedSha) {
    throw new Error(
      label +
        "_health_sha_mismatch:" +
        String(result.body && result.body.gitSha) +
        " expected=" +
        expectedSha,
    );
  }
  if (
    result.body.db?.configured !== true ||
    result.body.db?.ok !== true ||
    result.body.redis?.configured !== true ||
    result.body.redis?.ok !== true
  ) {
    throw new Error(label + "_backend_dependency_health_not_ready");
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    const webRes = await page.goto(web + "/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!webRes || webRes.status() !== 200) {
      throw new Error("web_root_not_200");
    }
    if ((await page.title()) !== "퍼뜩") {
      throw new Error("web_title_drift:" + (await page.title()));
    }
    await assertHealth(page, "web");

    const loginRes = await page.goto(web + "/auth/login", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!loginRes || loginRes.status() !== 200) {
      throw new Error("web_login_not_200");
    }

    const opsRes = await page.goto(ops + "/admin", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!opsRes || opsRes.status() !== 200) {
      throw new Error("ops_admin_not_200");
    }
    if (!(await page.title()).includes("퍼뜩 운영센터")) {
      throw new Error("ops_title_drift:" + (await page.title()));
    }
    await assertHealth(page, "ops");

    console.log(
      "[staging-browser-smoke] PASS web+login+ops + same-origin exact API " +
        expectedSha,
    );
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("[staging-browser-smoke] FAIL", err && err.stack ? err.stack : err);
  process.exit(1);
});
