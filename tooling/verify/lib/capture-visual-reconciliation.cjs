/**
 * Local runtime capture for visual reconciliation.
 * Production host fallback 금지.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ensureLocalWebRuntime } = require("../../e2e/lib/local-web-runtime.cjs");
const { stubAccountHub } = require("../../e2e/lib/account-route-stubs.cjs");
const { stubAuthenticatedEmptyHome } = require("../../e2e/lib/consumer-route-stubs.cjs");

const root = path.resolve(__dirname, "../../..");

async function shot(page, file, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(400);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, fullPage: false });
}

async function overlay(page, refPath, runtimePath, outPath) {
  if (!fs.existsSync(refPath) || !fs.existsSync(runtimePath)) return;
  const ref = fs.readFileSync(refPath).toString("base64");
  const run = fs.readFileSync(runtimePath).toString("base64");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#111">
    <div style="position:relative;display:inline-block">
      <img src="data:image/png;base64,${ref}" style="display:block;width:100%">
      <img src="data:image/png;base64,${run}" style="position:absolute;inset:0;width:100%;height:100%;opacity:.5">
    </div></body></html>`);
  const box = await page.locator("div").first().boundingBox();
  if (!box) return;
  await page.setViewportSize({
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
  });
  await page.screenshot({ path: outPath, fullPage: true });
}

async function sideBySide(page, refPath, runtimePath, outPath) {
  if (!fs.existsSync(refPath) || !fs.existsSync(runtimePath)) return;
  const ref = fs.readFileSync(refPath).toString("base64");
  const run = fs.readFileSync(runtimePath).toString("base64");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#111;display:flex">
    <img src="data:image/png;base64,${ref}" style="display:block;width:50%;height:auto">
    <img src="data:image/png;base64,${run}" style="display:block;width:50%;height:auto">
  </body></html>`);
  await page.waitForTimeout(200);
  const box = await page.locator("body").boundingBox();
  if (!box) return;
  await page.setViewportSize({
    width: Math.min(1600, Math.ceil(box.width) || 1440),
    height: Math.min(900, Math.ceil(box.height) || 800),
  });
  await page.screenshot({ path: outPath, fullPage: true });
}

async function pixelDiff(page, refPath, runtimePath, outPath) {
  if (!fs.existsSync(refPath) || !fs.existsSync(runtimePath)) return;
  const ref = fs.readFileSync(refPath).toString("base64");
  const run = fs.readFileSync(runtimePath).toString("base64");
  const dataUrl = await page.evaluate(async ({ ref, run }) => {
    function load(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }
    const a = await load(`data:image/png;base64,${ref}`);
    const b = await load(`data:image/png;base64,${run}`);
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(a, 0, 0);
    const pa = ctx.getImageData(0, 0, w, h);
    ctx.drawImage(b, 0, 0);
    const pb = ctx.getImageData(0, 0, w, h);
    const out = ctx.createImageData(w, h);
    for (let i = 0; i < pa.data.length; i += 4) {
      const dr = Math.abs(pa.data[i] - pb.data[i]);
      const dg = Math.abs(pa.data[i + 1] - pb.data[i + 1]);
      const db = Math.abs(pa.data[i + 2] - pb.data[i + 2]);
      const changed = dr + dg + db > 48;
      out.data[i] = changed ? 255 : 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = changed ? 80 : 0;
      out.data[i + 3] = changed ? 220 : 40;
    }
    ctx.putImageData(out, 0, 0);
    return canvas.toDataURL("image/png");
  }, { ref, run });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">
    <img src="${dataUrl}" style="display:block">
  </body></html>`);
  const box = await page.locator("img").first().boundingBox();
  if (!box) return;
  await page.setViewportSize({
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
  });
  await page.screenshot({ path: outPath, fullPage: true });
}

async function main() {
  const scope = String(process.env.CAPTURE_SCOPE || "all");
  const runtime = await ensureLocalWebRuntime({ timeoutMs: 180000 });
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const ev = path.join(root, "governance/visual-reconciliation");

  page.setDefaultNavigationTimeout(60000);
  async function visit(url) {
    await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(800);
  }

  if (scope !== "account") {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "load" });
  await shot(page, path.join(ev, "home/RUNTIME_UNAVAILABLE_DESKTOP.png"), 1440, 1080);
  await shot(page, path.join(ev, "home/RUNTIME_UNAVAILABLE_MOBILE.png"), 390, 693);

  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await stubAuthenticatedEmptyHome(page);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/`, { waitUntil: "load" });
  await page.waitForSelector("[data-testid='home-authenticated']", { timeout: 20000 });
  await shot(page, path.join(ev, "home/RUNTIME_DESKTOP.png"), 1440, 1080);
  await page.setViewportSize({ width: 390, height: 693 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(ev, "home/RUNTIME_MOBILE.png"),
    fullPage: false,
  });
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});

  await page.setViewportSize({ width: 1440, height: 1080 });
  await visit(`${runtime.baseUrl}/profits`);
  await shot(page, path.join(ev, "opportunity/list-RUNTIME_DESKTOP.png"), 1440, 1080);
  await shot(page, path.join(ev, "opportunity/list-RUNTIME_MOBILE.png"), 390, 693);

  await page.setViewportSize({ width: 1440, height: 1080 });
  await visit(`${runtime.baseUrl}/wallet`);
  await shot(page, path.join(ev, "wallet/RUNTIME_DESKTOP.png"), 1440, 1080);
  await shot(page, path.join(ev, "wallet/RUNTIME_MOBILE.png"), 390, 693);

  await page.setViewportSize({ width: 1440, height: 1080 });
  await visit(`${runtime.baseUrl}/trades`);
  await shot(page, path.join(ev, "trades/RUNTIME_DESKTOP.png"), 1440, 1080);
  await shot(page, path.join(ev, "trades/RUNTIME_MOBILE.png"), 390, 693);
  }

  await stubAccountHub(page, "ready");
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto(`${runtime.baseUrl}/me`, { waitUntil: "load" });
  await page.waitForSelector("[data-account-layout='desktop'], [data-testid='me-hub']");
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(ev, "account/RUNTIME_DESKTOP.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 1024, height: 1080 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(ev, "account/RUNTIME_1024.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(ev, "account/RUNTIME_768.png"),
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 693 });
  await page.waitForSelector("[data-account-layout='mobile']");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(ev, "account/RUNTIME_MOBILE.png"),
    fullPage: false,
  });

  await overlay(
    page,
    path.join(ev, "account/REFERENCE_DESKTOP.png"),
    path.join(ev, "account/RUNTIME_DESKTOP.png"),
    path.join(ev, "account/OVERLAY_DESKTOP.png"),
  );
  await overlay(
    page,
    path.join(ev, "account/REFERENCE_MOBILE.png"),
    path.join(ev, "account/RUNTIME_MOBILE.png"),
    path.join(ev, "account/OVERLAY_MOBILE.png"),
  );
  await sideBySide(
    page,
    path.join(ev, "account/REFERENCE_DESKTOP.png"),
    path.join(ev, "account/RUNTIME_DESKTOP.png"),
    path.join(ev, "account/SIDEBYSIDE_DESKTOP.png"),
  );
  await sideBySide(
    page,
    path.join(ev, "account/REFERENCE_MOBILE.png"),
    path.join(ev, "account/RUNTIME_MOBILE.png"),
    path.join(ev, "account/SIDEBYSIDE_MOBILE.png"),
  );
  await pixelDiff(
    page,
    path.join(ev, "account/REFERENCE_DESKTOP.png"),
    path.join(ev, "account/RUNTIME_DESKTOP.png"),
    path.join(ev, "account/DIFF_DESKTOP.png"),
  );
  await pixelDiff(
    page,
    path.join(ev, "account/REFERENCE_MOBILE.png"),
    path.join(ev, "account/RUNTIME_MOBILE.png"),
    path.join(ev, "account/DIFF_MOBILE.png"),
  );

  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.setViewportSize({ width: 1440, height: 1080 });
  await visit(`${runtime.baseUrl}/profits/__missing__`);
  await shot(page, path.join(ev, "opportunity/room-RUNTIME_MISSING_DESKTOP.png"), 1440, 1080);
  await shot(page, path.join(ev, "opportunity/room-RUNTIME_MISSING_MOBILE.png"), 390, 693);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await visit(`${runtime.baseUrl}/trades/__missing__/execute`);
  await shot(page, path.join(ev, "opportunity/execute-RUNTIME_MISSING_DESKTOP.png"), 1440, 1080);

  if (scope !== "account") {
  await overlay(
    page,
    path.join(root, "governance/consumer-home-approval/baselines/approved-home-desktop-1440.png"),
    path.join(ev, "home/RUNTIME_DESKTOP.png"),
    path.join(ev, "home/OVERLAY_DESKTOP.png"),
  );
  await overlay(
    page,
    path.join(root, "governance/consumer-home-approval/baselines/approved-home-mobile-390.png"),
    path.join(ev, "home/RUNTIME_MOBILE.png"),
    path.join(ev, "home/OVERLAY_MOBILE.png"),
  );
  }

  await browser.close();
  await runtime.stop();
  console.log("[capture-visual-reconciliation] wrote consumer runtime captures");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
