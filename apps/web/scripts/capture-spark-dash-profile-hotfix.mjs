/**
 * Desktop Header Profile micro hotfix capture only.
 * founder-approved / v3 baseline PNG 을 덮어쓰지 않는다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../../tooling/verify/stack-lock.cjs"));
const { chromium } = require("@playwright/test");
const outDir = path.join(here, "../../../_tmp_spark_dash_refs");
const url = process.env.SD_URL ?? "http://localhost:3000/dev/spark-dash-desktop";

fs.mkdirSync(outDir, { recursive: true });

const hideChrome =
  "nextjs-portal, [data-next-mark-loading], #__next-build-watcher { display: none !important; }";

async function openPage(browser, width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror:${e}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console:${msg.text()}`);
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(".sd-profile", { timeout: 30000 });
  await page.addStyleTag({ content: hideChrome });
  await page.waitForTimeout(700);
  return { page, errors };
}

const browser = await chromium.launch({ headless: true });
const { page, errors } = await openPage(browser, 1440, 1080);

const shot1440 = path.join(outDir, "desktop-profile-hotfix-1440.png");
const cropPath = path.join(outDir, "desktop-profile-hotfix-crop.png");
await page.screenshot({ path: shot1440, fullPage: false });

const cropBox = await page.evaluate(() => {
  const headerRight = document.querySelector(".sd-header-right");
  const header = document.querySelector(".sd-header");
  if (!headerRight || !header) return null;
  const a = headerRight.getBoundingClientRect();
  const h = header.getBoundingClientRect();
  return {
    x: Math.max(0, Math.floor(a.left) - 20),
    y: Math.max(0, Math.floor(h.top)),
    width: Math.min(1440, Math.ceil(h.right - a.left) + 20),
    height: Math.ceil(h.height),
  };
});
if (cropBox) {
  await page.screenshot({ path: cropPath, clip: cropBox });
}

const profileHi = await page.locator(".sd-header-right").screenshot({
  path: path.join(outDir, "desktop-profile-hotfix-crop-2x.png"),
});
void profileHi;

const audit = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      cx: Math.round((r.y + r.height / 2) * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      color: s.color,
      gap: s.gap,
      display: s.display,
      alignItems: s.alignItems,
    };
  };

  const header = document.querySelector(".sd-header")?.getBoundingClientRect();
  const profile = document.querySelector(".sd-profile")?.getBoundingClientRect();
  const avatar = document.querySelector(".sd-avatar")?.getBoundingClientRect();
  const user = document.querySelector(".sd-user")?.getBoundingClientRect();
  const level = document.querySelector(".sd-level")?.getBoundingClientRect();
  const chevron = document.querySelector(".sd-chevron")?.getBoundingClientRect();
  const bell = document.querySelector(".sd-header-bell")?.getBoundingClientRect();
  const div = document.querySelector(".sd-header-div")?.getBoundingClientRect();
  const userbox = document.querySelector(".sd-userbox")?.getBoundingClientRect();

  const overflow = (el) =>
    el ? el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 : false;

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    header: pick(".sd-header"),
    headerRight: pick(".sd-header-right"),
    bell: pick(".sd-header-bell"),
    divider: pick(".sd-header-div"),
    profile: pick(".sd-profile"),
    avatarWrap: pick(".sd-avatar-wrap"),
    avatar: pick(".sd-avatar"),
    online: pick(".sd-online"),
    userbox: pick(".sd-userbox"),
    user: pick(".sd-user"),
    level: pick(".sd-level"),
    chevron: pick(".sd-chevron"),
    geometry: {
      headerCy: header ? Math.round((header.y + header.height / 2) * 10) / 10 : null,
      avatarCy: avatar ? Math.round((avatar.y + avatar.height / 2) * 10) / 10 : null,
      userboxCy: userbox ? Math.round((userbox.y + userbox.height / 2) * 10) / 10 : null,
      chevronCy: chevron ? Math.round((chevron.y + chevron.height / 2) * 10) / 10 : null,
      avatarToText: avatar && userbox ? Math.round((userbox.left - avatar.right) * 10) / 10 : null,
      nameToLevel: user && level ? Math.round((level.top - user.bottom) * 10) / 10 : null,
      textToChevron: userbox && chevron ? Math.round((chevron.left - userbox.right) * 10) / 10 : null,
      bellToDiv: bell && div ? Math.round((div.left - bell.right) * 10) / 10 : null,
      divToProfile: div && profile ? Math.round((profile.left - div.right) * 10) / 10 : null,
      profileRightPad: profile && header ? Math.round((header.right - profile.right) * 10) / 10 : null,
    },
    text: {
      name: document.querySelector(".sd-user")?.textContent?.trim() ?? "",
      level: document.querySelector(".sd-level")?.textContent?.trim() ?? "",
    },
    clipping: {
      user: overflow(document.querySelector(".sd-user")),
      level: overflow(document.querySelector(".sd-level")),
      chevron: overflow(document.querySelector(".sd-chevron")),
      profile: overflow(document.querySelector(".sd-profile")),
      header: overflow(document.querySelector(".sd-header")),
    },
    overlap: {
      bellProfile:
        bell && profile
          ? !(bell.right <= profile.left || profile.right <= bell.left)
          : null,
    },
  };
});

async function sanity(width) {
  const { page: p, errors: e } = await openPage(browser, width, 1080);
  const shot = path.join(outDir, `desktop-profile-hotfix-${width}.png`);
  await p.screenshot({ path: shot, fullPage: false });
  const data = await p.evaluate(() => {
    const profile = document.querySelector(".sd-profile")?.getBoundingClientRect();
    const header = document.querySelector(".sd-header")?.getBoundingClientRect();
    const bell = document.querySelector(".sd-header-bell")?.getBoundingClientRect();
    const user = document.querySelector(".sd-user");
    const level = document.querySelector(".sd-level");
    const chevron = document.querySelector(".sd-chevron");
    const overflow = (el) =>
      el ? el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 : false;
    return {
      profileW: profile ? Math.round(profile.width) : null,
      profileRight: profile ? Math.round(profile.right) : null,
      headerRight: header ? Math.round(header.right) : null,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      clipping: {
        user: overflow(user),
        level: overflow(level),
        chevron: overflow(chevron),
      },
      overlapBell: bell && profile ? !(bell.right <= profile.left) : null,
    };
  });
  await p.close();
  return { width, errors: e, shot, ...data };
}

const sanity1280 = await sanity(1280);
const sanity1366 = await sanity(1366);
const sanity1680 = await sanity(1680);
const sanity1920 = await sanity(1920);

await page.close();
await browser.close();

const report = {
  errors,
  audit,
  sanity: [sanity1280, sanity1366, sanity1680, sanity1920],
  paths: {
    shot1440,
    crop: cropPath,
  },
};
fs.writeFileSync(path.join(outDir, "profile-hotfix-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
