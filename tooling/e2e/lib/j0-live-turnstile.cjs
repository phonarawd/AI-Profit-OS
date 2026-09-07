/** 전용 ops 로그인에서 Turnstile 토큰을 여러 개 만든다. 값 출력 금지. */
"use strict";

const { hosts, accessHeaders } = require("./j0-live-lib.cjs");

async function mintTurnstileTokens(count) {
  const n = Math.max(1, count);
  let chromium;
  try {
    ({ chromium } = require("@playwright/test"));
  } catch {
    throw new Error("playwright_unavailable");
  }
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });
  const tokens = [];
  try {
    for (let i = 0; i < n; i += 1) {
      const page = await browser.newPage({ extraHTTPHeaders: accessHeaders() });
      page.setDefaultTimeout(45000);
      await page.goto(hosts.DEDICATED_OPS_LOGIN, { waitUntil: "domcontentloaded" });
      const token = await page
        .waitForFunction(() => {
          const el = document.querySelector(
            'input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]',
          );
          const v = el && el.value;
          return v && v.length > 20 ? v : null;
        }, { timeout: 40000 })
        .then((h) => h.jsonValue())
        .catch(() => "");
      await page.close();
      if (!token) throw new Error("turnstile_token_empty");
      tokens.push(token);
    }
  } finally {
    await browser.close();
  }
  return tokens;
}

function takeToken(pool) {
  const t = pool.shift();
  if (!t) throw new Error("turnstile_pool_empty");
  return t;
}

module.exports = { mintTurnstileTokens, takeToken };
