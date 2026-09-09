/** 전용 웹 민트에서 Turnstile 토큰을 모은다. 값 출력 금지. */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hosts } = require("./j0-live-lib.cjs");
const { launchCdpChrome, mintWithChromeFile } = require("./j0-live-chrome-cdp.cjs");

function tokenFileNameOk(name) {
  return /^j0-turnstile(\s*\(\d+\))?\.token(\s*\(\d+\))?(\.txt)?$/i.test(String(name || ""));
}

function defaultTokenDir() {
  const fromEnv = String(process.env.J0_TURNSTILE_DIR || "").trim();
  if (fromEnv) return fromEnv;
  return path.join(os.homedir(), "Downloads");
}

function loadTokensFromDir(dir, count) {
  const n = Math.max(1, count);
  if (!dir || !fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter(tokenFileNameOk)
    .map((name) => {
      const abs = path.join(dir, name);
      let mtime = 0;
      try {
        mtime = fs.statSync(abs).mtimeMs;
      } catch {
        mtime = 0;
      }
      return { abs, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  const tokens = [];
  for (const file of files) {
    if (tokens.length >= n) break;
    let raw = "";
    try {
      raw = fs.readFileSync(file.abs, "utf8").trim();
    } catch {
      continue;
    }
    try {
      fs.unlinkSync(file.abs);
    } catch {
      /* ignore */
    }
    if (raw.length > 20) tokens.push(raw);
  }
  return tokens;
}

function launchOpts() {
  const headed = process.env.J0_PW_HEADED === "1";
  const launch = {
    headless: !headed,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--disable-dev-shm-usage",
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  };
  if (process.env.J0_PW_CHANNEL) launch.channel = process.env.J0_PW_CHANNEL;
  else if (process.platform === "win32") launch.channel = "chrome";
  return launch;
}

async function launchBrowser(chromium) {
  if (process.platform === "win32" && process.env.J0_PW_CDP !== "0") {
    try {
      const cdp = await launchCdpChrome(chromium);
      if (cdp) return cdp;
    } catch {
    }
  }
  try {
    return { browser: await chromium.launch(launchOpts()), child: null };
  } catch (err) {
    if (!launchOpts().channel) throw err;
    const fallback = launchOpts();
    delete fallback.channel;
    return { browser: await chromium.launch(fallback), child: null };
  }
}

async function mintTurnstileTokens(count) {
  const n = Math.max(1, count);
  let chromium;
  try {
    ({ chromium } = require("@playwright/test"));
  } catch {
    throw new Error("playwright_unavailable");
  }
  const launched = await launchBrowser(chromium);
  const browser = launched.browser || launched;
  const tokens = [];
  try {
    for (let i = 0; i < n; i += 1) {
      const page = await (browser.contexts()[0] || (await browser.newContext())).newPage();
      page.setDefaultTimeout(45000);
      await page.addInitScript(() => {
        window.__aipoJ0Ts = "";
        const wrap = () => {
          const ts = window.turnstile;
          if (!ts || typeof ts.render !== "function" || ts.__aipoJ0) return;
          ts.__aipoJ0 = true;
          const orig = ts.render.bind(ts);
          ts.render = (el, opts) => {
            const prev = opts && opts.callback;
            return orig(
              el,
              Object.assign({}, opts, {
                callback: (token) => {
                  window.__aipoJ0Ts = String(token || "");
                  if (typeof prev === "function") prev(token);
                },
                "error-callback": (code) => {
                  window.__aipoJ0Err = String(code || "error");
                  if (typeof opts["error-callback"] === "function") opts["error-callback"](code);
                },
              }),
            );
          };
        };
        const id = setInterval(wrap, 20);
        setTimeout(() => clearInterval(id), 40000);
      });
      const nav = await page.goto(hosts.DEDICATED_WEB_MINT, { waitUntil: "domcontentloaded" });
      if (nav && nav.status() >= 300 && nav.status() < 400) throw new Error("turnstile_access_redirect");
      if (nav && nav.status() === 404) throw new Error("turnstile_mint_not_deployed");
      if (await page.locator("[data-turnstile='not-configured']").count()) {
        throw new Error("turnstile_not_configured");
      }
      await page.locator("[data-testid='turnstile-field']").waitFor({ timeout: 15000 }).catch(() => undefined);
      await page.locator("iframe[src*='challenges.cloudflare.com']").first().waitFor({ timeout: 20000 }).catch(() => undefined);
      await page
        .frameLocator("iframe[src*='challenges.cloudflare.com']")
        .first()
        .locator("input[type=checkbox]")
        .click({ timeout: 8000 })
        .catch(() => undefined);
      const token = await page
        .waitForFunction(() => {
          if (window.__aipoJ0Ts && window.__aipoJ0Ts.length > 20) return window.__aipoJ0Ts;
          const el = document.querySelector(
            'input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]',
          );
          const v = el && el.value;
          return v && v.length > 20 ? v : null;
        }, { timeout: 40000 })
        .then((h) => h.jsonValue())
        .catch(() => "");
      if (!token) {
        const dbg = await page
          .evaluate(() => ({
            href: location.href,
            field: !!document.querySelector("[data-testid=turnstile-field]"),
            notCfg: !!document.querySelector("[data-turnstile=not-configured]"),
            iframe: document.querySelectorAll("iframe[src*='challenges.cloudflare.com']").length,
            hasTs: typeof window.turnstile,
            wrapped: !!(window.turnstile && window.turnstile.__aipoJ0),
            tsLen: String(window.__aipoJ0Ts || "").length,
            err: String(window.__aipoJ0Err || ""),
            hasInput: !!document.querySelector("input[name=cf-turnstile-response]"),
            inputLen: String(
              (document.querySelector("input[name=cf-turnstile-response]") || {}).value || "",
            ).length,
            kids: Array.from(
              (document.querySelector("[data-testid=turnstile-field]") || { children: [] }).children,
            ).map((e) => e.tagName),
            iframes: Array.from(document.querySelectorAll("iframe")).map((f) =>
              String(f.src || "").split("?")[0].slice(0, 60),
            ),
            site: String(window.__aipoJ0Site || ""),
          }))
          .catch(() => ({}));
        await page.close();
        throw new Error("turnstile_token_empty " + JSON.stringify(dbg));
      }
      await page.close();
      tokens.push(token);
    }
  } finally {
    await browser.close();
    if (launched.child) launched.child.kill();
  }
  return tokens;
}

function takeToken(pool) {
  const t = pool.shift();
  if (!t) throw new Error("turnstile_pool_empty");
  return t;
}

module.exports = {
  mintTurnstileTokens,
  takeToken,
  mintWithChromeFile,
  loadTokensFromDir,
  defaultTokenDir,
};
