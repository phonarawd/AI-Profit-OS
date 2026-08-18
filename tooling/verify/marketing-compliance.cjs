/**
 * verify:marketing-compliance — Infra §31.4.0 · §31.7 · UI §6.4c.1 A/G
 * landing 금지어 1:1 (괴리율 포함) · /l/*+/ads auto fbq|ttq import 0
 * Lead emit 가드 = consentMarketing===true only · 미실장 emit0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

/** UI §6.4c.1 A · Infra §31.4.0 1:1 */
const BANNED_KO = ["수익", "투자", "USDT", "테더", "보장", "차익", "괴리율", "재테크", "알바"];
const BANNED_EN = ["profit", "arbitrage", "investment", "deposit", "USDT"];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

const copyRel = "packages/ui/copy/ko/landing.ts";
const copy = read(copyRel);
if (copy) {
  const body = stripComments(copy);
  for (const w of BANNED_KO) {
    if (body.includes(w)) {
      fails.push(`landing.ts contains banned word: ${w}`);
    }
  }
  // EN tokens in string values (case-insensitive) — utility namespace only
  for (const w of BANNED_EN) {
    const re = new RegExp(`["'\`][^"'\`]*\\b${w}\\b[^"'\`]*["'\`]`, "i");
    if (re.test(body)) {
      fails.push(`landing.ts string contains banned EN token: ${w}`);
    }
  }
  if (copy.includes("expectedNotGuaranteed")) {
    fails.push("landing.ts must not export expectedNotGuaranteed");
  }
}

const landingRoutes = [
  "apps/web/app/l/[variant]/page.tsx",
  "apps/web/app/ads/page.tsx",
  "apps/web/app/ads/[variant]/page.tsx",
  "packages/ui/components/landing/Landing3s.tsx",
];
for (const rel of landingRoutes) {
  const src = read(rel);
  if (!src) continue;
  if (/\bfbq\b|\bttq\b|facebook\.net\/en_US\/fbevents|analytics\.tiktok\.com/i.test(src)) {
    fails.push(`${rel} must not auto-import fbq/ttq pixel SDK (§31.3c)`);
  }
  if (/gtag\s*\(|googletagmanager/i.test(src)) {
    fails.push(`${rel} must not auto-load gtag on landing`);
  }
}

const emit = read("packages/ui/components/landing/emitLandingLead.ts");
if (emit) {
  if (!emit.includes("getConsentMarketing") || !emit.includes("!== true")) {
    fails.push(
      "emitLandingLead must gate on consentMarketing === true (미실장·false = emit 0)",
    );
  }
  if (!emit.includes("emit 0") && !emit.includes("return;")) {
    fails.push("emitLandingLead must no-op when sdk missing");
  }
} else {
  fails.push("missing packages/ui/components/landing/emitLandingLead.ts");
}

const landing3s = read("packages/ui/components/landing/Landing3s.tsx");
if (landing3s && !landing3s.includes("emitLandingLeadIfConsented")) {
  fails.push("Landing3s CTA must call emitLandingLeadIfConsented (§6.4c.1 G)");
}

const wire = read("packages/ui/canon/surfaces/landing-3s.wire.json");
if (wire) {
  for (const f of [
    "landing_copy_수익",
    "landing_copy_투자",
    "landing_copy_USDT",
    "landing_copy_테더",
    "landing_copy_차익",
    "landing_copy_괴리율",
    "auto_pixel_sdk_on_landing",
    "expectedNotGuaranteed_on_landing",
  ]) {
    if (!wire.includes(f)) {
      fails.push(`landing-3s.wire forbidden missing ${f}`);
    }
  }
}

if (fails.length) {
  console.error("[verify:marketing-compliance] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:marketing-compliance] PASS (금지어 1:1 · auto pixel 0 · consent emit 가드)",
);
