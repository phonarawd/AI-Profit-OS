/**
 * REL-012 — axe-core 스캔 런타임.
 * Playwright spec과 verify가 같은 함수를 쓴다. MCP-only 경로 0.
 * 브라우저 풀매트릭스는 AXE_BROWSER=1 (로컬 저사양 기본 OFF).
 */
const path = require("path");

const AXE_SCAN_TARGETS = [
  { name: "home-mobile", route: "/", width: 390, height: 693 },
  { name: "home-desktop", route: "/", width: 1440, height: 1080 },
  { name: "login-mobile", route: "/auth/login", width: 390, height: 693 },
  { name: "signup-mobile", route: "/auth/signup", width: 390, height: 693 },
  { name: "onboarding-mobile", route: "/onboarding", width: 390, height: 693 },
];

function resolvePkg(name) {
  const root = path.resolve(__dirname, "../../..");
  try {
    return require(name);
  } catch {
    return require(require.resolve(name, { paths: [root] }));
  }
}

function resolveAxeCore() {
  return resolvePkg("axe-core");
}

function resolveJsdom() {
  return resolvePkg("jsdom");
}

function blockingViolations(results) {
  return (results.violations || []).filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

/**
 * @param {string} html
 * @returns {Promise<import("axe-core").AxeResults>}
 */
async function runAxeOnHtml(html) {
  const axe = resolveAxeCore();
  const { JSDOM, VirtualConsole } = resolveJsdom();
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => {});
  const dom = new JSDOM(html, {
    url: "http://127.0.0.1/",
    pretendToBeVisual: true,
    runScripts: "outside-only",
    virtualConsole,
  });
  const { window } = dom;
  window.eval(axe.source);
  const results = await window.axe.run(window.document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
    // jsdom에는 canvas가 없어 대비 규칙은 브라우저(AXE_BROWSER)에서만 측정한다.
    rules: { "color-contrast": { enabled: false } },
  });
  window.close();
  return results;
}

const INTENTIONAL_FAIL_HTML =
  '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><button></button></body></html>';

const CLEAN_PROBE_HTML =
  '<!doctype html><html lang="ko"><head><title>퍼뜩</title></head><body><main><h1>로그인</h1><button type="button">확인</button></main></body></html>';

/**
 * Browser Axe via evaluate(source). addScriptTag dies when Next remounts.
 * Context-destroyed is retried once after domcontentloaded.
 */
async function scanPageAxe(page) {
  const axeSource = resolveAxeCore().source;
  const run = async () => {
    await page.evaluate(axeSource);
    return page.evaluate(async () =>
      window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      }),
    );
  };
  try {
    return await run();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (!/Execution context was destroyed|Target closed|navigation/i.test(msg)) {
      throw err;
    }
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    return run();
  }
}

module.exports = {
  AXE_SCAN_TARGETS,
  blockingViolations,
  runAxeOnHtml,
  scanPageAxe,
  INTENTIONAL_FAIL_HTML,
  CLEAN_PROBE_HTML,
};
