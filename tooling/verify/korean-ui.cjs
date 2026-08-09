/**
 * verify:korean-ui — §27 · §27.10 copy skeleton · retired brand 0 · EN leak heuristics
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

const required = [
  "packages/ui/copy/ko/index.ts",
  "packages/ui/copy/ko/peotteok.ts",
  "packages/ui/copy/ko/toast.ts",
  "packages/ui/copy/ko/user.ts",
  "packages/ui/copy/ko/auth.ts",
  "packages/ui/copy/ko/onboarding.ts",
  "packages/ui/copy/ko/landing.ts",
  "packages/ui/copy/ko/guide.ts",
  "packages/ui/copy/ko/settings.ts",
  "packages/ui/copy/ko/emoji.ts",
  "packages/ui/copy/ko/legal.ts",
];
for (const f of required) read(f);

const index = read("packages/ui/copy/ko/index.ts");
if (index) {
  for (const key of [
    "toast",
    "user",
    "auth",
    "onboarding",
    "landing",
    "guide",
    "settings",
    "peotteok",
    "legal",
  ]) {
    if (!index.includes(key)) fails.push(`copy/ko/index.ts must export ${key}`);
  }
}

const peotteok = read("packages/ui/copy/ko/peotteok.ts");
if (peotteok) {
  for (const k of [
    "greeting",
    "shortConfirm",
    "refuseS",
    "busy",
    "helpNudge",
    "seniorPace",
    "youngPace",
    "midPace",
  ]) {
    if (!peotteok.includes(`${k}:`)) {
      fails.push(`peotteok.voice missing ${k}`);
    }
  }
  if (!peotteok.includes("voice:")) fails.push("peotteok.voice block missing");
}

// PART1b · §6.4c.1 A — landing utility namespace skeleton (depth = PART2c)
const landing = read("packages/ui/copy/ko/landing.ts");
if (landing) {
  for (const k of [
    "utilityDisclaimer",
    "transitionDisclosure",
    "ctaOpenPriceMap",
    "ctaStartUtility",
    "ctaContinueUtility",
    "variants",
    "meta:",
    "tt:",
    "google:",
  ]) {
    if (!landing.includes(k)) fails.push(`landing.ts missing utility key ${k}`);
  }
  if (!landing.includes("실시간 시세 맵 열기")) {
    fails.push('landing.ctaOpenPriceMap must be "실시간 시세 맵 열기"');
  }
  if (!landing.includes("시작하기") || !landing.includes("시세 맵 계속")) {
    fails.push("landing utility CTAs must include 시작하기 / 시세 맵 계속");
  }
}

// Guest utility surfaces — §6.4c.1 F banned words (string literals only)
const guestBanned = /수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바/;
for (const rel of [
  "packages/ui/copy/ko/landing.ts",
  "packages/ui/copy/ko/auth.ts",
  "packages/ui/copy/ko/onboarding.ts",
]) {
  const src = read(rel);
  if (!src) continue;
  for (const m of src.matchAll(/:\s*"([^"]*)"/g)) {
    const val = m[1];
    if (guestBanned.test(val)) {
      fails.push(`${rel} Guest utility banned token in "${val}"`);
    }
  }
}

const userSrc = read("packages/ui/copy/ko/user.ts");
if (userSrc) {
  for (const k of ["empty:", "hint:", "placeholder:", "tabs:"]) {
    if (!userSrc.includes(k)) fails.push(`user.ts missing ${k}`);
  }
}

const settings = read("packages/ui/copy/ko/settings.ts");
if (settings && !settings.includes("themeToggleForbidden: true")) {
  fails.push("settings.ts must lock themeToggleForbidden: true");
}

for (const banned of ["오늘수익", "바로번다"]) {
  const dirs = ["packages/ui/copy/ko", "apps/web/app"];
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs)) continue;
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(ent.name)) {
          const t = fs.readFileSync(p, "utf8");
          if (t.includes(banned)) {
            fails.push(`retired brand ${banned} in ${path.relative(root, p)}`);
          }
        }
      }
    };
    walk(abs);
  }
}

// Gender branch keys forbidden in copy
const copyKo = path.join(root, "packages/ui/copy/ko");
if (fs.existsSync(copyKo)) {
  for (const f of fs.readdirSync(copyKo)) {
    if (!f.endsWith(".ts")) continue;
    const t = fs.readFileSync(path.join(copyKo, f), "utf8");
    if (/\b(male|female|gender|오빠|언니|유저님)\b/.test(t)) {
      fails.push(`gender branch string in copy/ko/${f}`);
    }
  }
}

if (fails.length) {
  console.error("[verify:korean-ui] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:korean-ui] PASS (copy skeleton · voice · retired0 · gender0)");
