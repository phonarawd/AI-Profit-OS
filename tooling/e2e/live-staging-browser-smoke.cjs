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

async function assertHealth(context, origin, label) {
  const page = await context.newPage();
  try {
    const res = await page.goto(origin + "/api/v1/health", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (!res || res.status() !== 200) {
      throw new Error(label + "_health_status_" + String(res && res.status()));
    }
    let body = null;
    try {
      body = JSON.parse(await page.locator("body").innerText());
    } catch {
      throw new Error(label + "_health_json_invalid");
    }
    if (!body || body.gitSha !== expectedSha) {
      throw new Error(
        label +
          "_health_sha_mismatch:" +
          String(body && body.gitSha) +
          " expected=" +
          expectedSha,
      );
    }
    if (
      body.db?.configured !== true ||
      body.db?.ok !== true ||
      body.redis?.configured !== true ||
      body.redis?.ok !== true
    ) {
      throw new Error(label + "_backend_dependency_health_not_ready");
    }
  } finally {
    await page.close();
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

    // Use an isolated Chromium page for the API route. The consumer root may
    // legitimately navigate during session bootstrap; sharing that execution
    // context would make a healthy proxy look flaky.
    await assertHealth(context, web, "web");

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
    await assertHealth(context, ops, "ops");

    console.log(
      "[staging-browser-smoke] PASS web+login+ops + Chromium exact API " +
        expectedSha,
    );
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("[staging-browser-smoke] FAIL", err && err.stack ? err.stack : err);
  process.exit(1);
});
