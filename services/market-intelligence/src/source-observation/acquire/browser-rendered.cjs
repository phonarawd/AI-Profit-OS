/**
 * 공개 페이지 BROWSER_RENDERED acquire.
 * 기존 레포 Playwright owner(@playwright/test)만 재사용.
 * 우회 구현 없음.
 */

const { detectAccessBlock } = require("../extract/access-block.cjs");

function loadChromium() {
  try {
    return require("@playwright/test").chromium;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   url: string,
 *   readySelector?: string,
 *   optionalSelector?: string,
 *   waitForStructuredProduct?: boolean,
 *   now?: Date,
 * }} input
 */
async function acquireBrowserRenderedDocument(input) {
  const url = String((input && input.url) || "");
  if (!url) {
    return { ok: false, sourceStatus: "PARSE_FAILED", reason: "url_missing" };
  }

  const chromium = loadChromium();
  if (!chromium) {
    return {
      ok: false,
      sourceStatus: "TEMPORARY_ERROR",
      reason: "BROWSER_RENDERED_UNAVAILABLE",
      acquisitionMode: "BROWSER_RENDERED",
    };
  }

  const readySelector = input.readySelector || "body";
  const optionalSelector = input.optionalSelector || "";
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    const status = response ? response.status() : 0;
    const early = await page.content();
    const earlyBlock = detectAccessBlock({
      status,
      headers: response ? response.headers() : {},
      body: early,
    });
    if (earlyBlock.blocked) {
      return {
        ok: false,
        sourceStatus: "ACCESS_BLOCKED",
        reason: earlyBlock.reason,
        acquisitionMode: "BROWSER_RENDERED",
        html: early,
        status,
      };
    }

    try {
      await page.waitForSelector(readySelector, { timeout: 40000 });
    } catch {
      try {
        await page.waitForSelector('script[type="application/ld+json"]', { timeout: 8000 });
      } catch {
        /* product confirmation은 호출 측에서 판정 */
      }
    }
    if (optionalSelector) {
      try {
        await page.waitForSelector(optionalSelector, { timeout: 15000 });
      } catch {
        /* 가격 등 선택 필드 */
      }
    }
    if (input.waitForStructuredProduct) {
      try {
        await page.waitForFunction(
          () =>
            [...document.querySelectorAll('script[type="application/ld+json"]')].some((node) =>
              /"@type"\s*:\s*"Product"/.test(node.textContent || ""),
            ),
          { timeout: 15000 },
        );
      } catch {
        /* STRUCTURED_DATA는 호출 측에서 없으면 fail-closed */
      }
    }

    const html = await page.content();
    const blocked = detectAccessBlock({
      status,
      headers: response ? response.headers() : {},
      body: html,
    });
    if (blocked.blocked) {
      return {
        ok: false,
        sourceStatus: "ACCESS_BLOCKED",
        reason: blocked.reason,
        acquisitionMode: "BROWSER_RENDERED",
        html,
        status,
      };
    }
    if (status === 404) {
      return { ok: false, sourceStatus: "NOT_FOUND", reason: "http_404", acquisitionMode: "BROWSER_RENDERED" };
    }
    if (status && status >= 400) {
      return {
        ok: false,
        sourceStatus: "TEMPORARY_ERROR",
        reason: `http_${status}`,
        acquisitionMode: "BROWSER_RENDERED",
      };
    }

    return {
      ok: true,
      html,
      url,
      status,
      fetchedAt: (input.now || new Date()).toISOString(),
      acquisitionMode: "BROWSER_RENDERED",
    };
  } catch (err) {
    return {
      ok: false,
      sourceStatus: "TEMPORARY_ERROR",
      reason: "browser_render_error",
      acquisitionMode: "BROWSER_RENDERED",
      error: String(err && err.message ? err.message : err),
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
  }
}

module.exports = {
  acquireBrowserRenderedDocument,
  loadChromium,
};
