import { chromium } from "@playwright/test";
import fs from "fs";

const WEB = "https://ai-profit-web-preview.ebay-adapter.workers.dev";
const OPS = "https://ai-profit-ops-preview.ebay-adapter.workers.dev";

const shots = [
  { base: WEB, route: "/", width: 1440, height: 1080, file: "staging-home-pc.png" },
  { base: WEB, route: "/", width: 390, height: 844, file: "staging-home-mobile.png" },
  { base: WEB, route: "/auth/login", width: 1440, height: 1080, file: "staging-login-pc.png" },
  { base: WEB, route: "/me/guide/partners", width: 390, height: 844, file: "staging-partners-mobile.png" },
  { base: OPS, route: "/admin", width: 1440, height: 1080, file: "staging-admin-pc.png" },
  { base: OPS, route: "/admin", width: 390, height: 844, file: "staging-admin-mobile.png" },
];

const outDir = "C:\\Users\\PC\\Desktop\\AI_PROFIT_OS\\_staging_screens";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const s of shots) {
    const context = await browser.newContext({ viewport: { width: s.width, height: s.height } });
    const page = await context.newPage();
    await page.goto(s.base + s.route, { waitUntil: "domcontentloaded", timeout: 30000 });
    try {
      await page.waitForLoadState("networkidle", { timeout: 6000 });
    } catch {
      // ok, screenshot whatever settled
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}\\${s.file}` });
    console.log("saved", s.file);
    await context.close();
  }
  await browser.close();
})();
