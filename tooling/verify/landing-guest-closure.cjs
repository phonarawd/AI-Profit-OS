/**
 * verify:landing-guest-closure — REL-100
 * 게스트 `/` 입구. Home 시각 재설계 0. 가짜 수익 0. 신규 마케팅 랜딩 발명 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const homeClient = read("apps/web/app/HomeDesktopClient.tsx");
const page = read("apps/web/app/page.tsx");
const guest = read("apps/web/app/GuestFirstVisit.tsx");
const emptyMap = read("apps/web/components/spark-dash-home/map-runtime.ts");
const freeze = read("governance/consumer-home-approval/home-approval-freeze.v1.json");
const landingCopy = read("packages/ui/copy/ko/landing.ts");

if (page && !page.includes("HomeDesktopClient")) {
  fail("guest `/` must stay HomeDesktopClient (새 마케팅 랜딩 발명 금지)");
}
if (homeClient.includes("SPARK_DASH_DESKTOP_VISUAL_FIXTURE")) {
  fail("production Home client must not import visual fixture");
}
if (!homeClient.includes("emptyRuntimeModel")) {
  fail("guest/unauthorized Home must use emptyRuntimeModel");
}
if (!/viewState === ["']unauthorized["']/.test(homeClient)) {
  fail("Home client must keep unauthorized → empty model");
}
if (!homeClient.includes("GuestFirstVisit")) {
  fail("unauthorized `/` must offer GuestFirstVisit without rewriting Home");
}

const homeDesktop = read("apps/web/components/spark-dash-home/HomeDesktop.tsx");
const homeMobile = read("apps/web/components/spark-dash-home/HomeMobile.tsx");
const homeCss = read("apps/web/components/spark-dash-home/spark-dash-home.css");
if (!homeDesktop || !homeMobile || !homeCss) {
  fail("Home freeze files must remain");
}

if (emptyMap) {
  const emptyFn = emptyMap.slice(emptyMap.indexOf("export function emptyRuntimeModel"));
  const slice = emptyFn.slice(0, 1800);
  if (slice.includes('"0"') || slice.includes("'0'") || /usdt:\s*"0/.test(slice)) {
    fail("emptyRuntimeModel must not coerce missing money to 0");
  }
  if (!slice.includes("usdt: null") || !slice.includes("hero: null")) {
    fail("emptyRuntimeModel must keep money/hero as null");
  }
}

if (guest) {
  if (!guest.includes("/auth/signup") || !guest.includes("/auth/login")) {
    fail("GuestFirstVisit must reach signup and login");
  }
  if (guest.includes("2,450.00") || /Math\.random/.test(guest)) {
    fail("GuestFirstVisit must not invent money");
  }
  if (/수익 보장|지금 참여하면|남은 자리|카운트다운/.test(guest)) {
    fail("GuestFirstVisit must not use FOMO copy");
  }
}

if (landingCopy) {
  const body = landingCopy
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  if (/수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/.test(body)) {
    fail("landing copy must keep utility words only");
  }
}

if (freeze && !freeze.includes("\"LOCKED\"")) {
  fail("Home freeze LOCKED must remain");
}

const spec = read("tooling/e2e/specs/landing-guest.spec.cjs");
if (!spec.includes("/auth/signup") || !spec.includes("/auth/login")) {
  fail("landing-guest spec must prove signup/login reachability");
}
if (!spec.includes("390") || !spec.includes("1440")) {
  fail("landing-guest spec must cover 390 and 1440");
}

function finish() {
  if (fails.length) {
    console.error("[verify:landing-guest-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:landing-guest-closure] PASS (guest `/` empty truth · signup/login CTA · Home freeze)",
  );
}

if (process.env.LANDING_GUEST_NESTED !== "1") {
  const jargon = spawnSync(
    process.execPath,
    [path.join(__dirname, "no-it-jargon.cjs")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(jargon.stdout || "");
  process.stderr.write(jargon.stderr || "");
  if (jargon.status !== 0) fail("no-it-jargon failed");

  const { runAxeOnHtml, blockingViolations } = require("../e2e/lib/axe-scan.cjs");
  const html = `<!doctype html><html lang="ko"><head><title>퍼뜩</title></head>
  <body>
    <main>
      <h1>퍼뜩</h1>
      <p>여러 사이트를 돌아다니지 않고 확인</p>
      <a href="/auth/signup">가입하고 시작하기</a>
      <a href="/auth/login">로그인</a>
    </main>
  </body></html>`;
  runAxeOnHtml(html)
    .then((results) => {
      if (blockingViolations(results).length) {
        fail("guest landing axe fixture has blocking violations");
      }
      finish();
    })
    .catch((err) => {
      fail(`axe run error: ${err.message}`);
      finish();
    });
} else {
  finish();
}
