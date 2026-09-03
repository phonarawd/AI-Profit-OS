/**
 * verify:seo-schema — POST-007
 * Public entity truth · crawl/index boundaries · structured-data anti-fraud locks.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const read = (rel) => {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
};
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const robots = read("apps/web/app/robots.ts");
const sitemap = read("apps/web/app/sitemap.ts");
const layout = read("apps/web/app/layout.tsx");
const home = read("apps/web/app/page.tsx");
const manifest = read("apps/web/public/manifest.webmanifest");
const guestChrome = read("apps/web/app/components/GuestChrome.tsx");
const guestFirst = read("apps/web/app/GuestFirstVisit.tsx");
const landingCopy = stripComments(read("packages/ui/copy/ko/landing.ts"));
const trustCopy = stripComments(read("packages/ui/copy/ko/trust.ts"));
const operatorCopy = stripComments(read("packages/ui/copy/ko/operator.ts"));
const publicLicense = read("apps/web/public/kyb/trade-license-1135431.html");

let operator = {};
try {
  operator = JSON.parse(read("schemas/operator-entity.instance.json"));
} catch (err) {
  fail("operator entity JSON parse failed: " + err.message);
}

if (!layout.includes('metadataBase: new URL("https://hiptk.app")')) {
  fail("layout metadataBase must be https://hiptk.app");
}
if (/canonical\s*:\s*["']\//.test(layout)) {
  fail("root layout must not force global canonical=/");
}
if (!home.includes('canonical: "/"')) fail("home canonical must be /");

for (const needle of ['"@graph"', '"Organization"', '"WebSite"']) {
  if (!home.includes(needle)) fail("root JSON-LD missing " + needle);
}
if (!home.includes('name: "퍼뜩"')) fail("WebSite.name must be 퍼뜩");
if (!home.includes('alternateName: "PUTDUK"')) fail("WebSite alternateName must be PUTDUK");
if (!home.includes('from "@aipo/operator-entity"')) fail("Organization must import operator entity SSOT");
for (const needle of ["operator.legalName", "operator.licenseNumber", "operator.supportEmail", 'propertyID: "DET Trade License"']) {
  if (!home.includes(needle)) fail("Organization SSOT binding missing: " + needle);
}
if (operator.legalName !== "PRE-OWNED WATCHES L.L.C") fail("operator legalName drift: " + operator.legalName);
if (operator.licenseNumber !== "1135431") fail("DET license drift: " + operator.licenseNumber);
if (operator.supportEmail !== "support@hiptk.app") fail("support email drift: " + operator.supportEmail);
if (!operator.verifiedAt && operator.licenseStatus !== "pending_verification") {
  fail("unverified DET instance must remain pending_verification");
}

const jsonLdBanned = [
  /aggregateRating/i,
  /reviewCount/i,
  /["']Review["']/i,
  /FinancialProduct/i,
  /InvestmentProduct/i,
  /guaranteed\s*(profit|return)/i,
  /AI Profit OS/i,
];
for (const re of jsonLdBanned) {
  if (re.test(home)) fail("public JSON-LD banned signal: " + re);
}

if (!robots.includes('const SITE_URL = "https://hiptk.app"')) fail("robots canonical host drift");
if (!robots.includes('sitemap: SITE_URL + "/sitemap.xml"')) fail("robots sitemap pointer missing");
if (robots.includes('"/ads"') || robots.includes('"/l/"')) {
  fail("ads/l noindex routes must stay crawlable; do not Disallow them");
}
for (const privateRoute of ['"/auth/"','"/wallet/"','"/trades/"','"/profits"','"/me/"','"/dev/"','"/admin/"']) {
  if (!robots.includes(privateRoute)) fail("robots private boundary missing " + privateRoute);
}

const sitemapUrls = Array.from(sitemap.matchAll(/SITE_URL \+ "([^"]+)"/g)).map((m) => m[1]);
const expectedSitemap = ["/", "/me/legal", "/me/legal/terms", "/me/legal/privacy"];
if (JSON.stringify(sitemapUrls) !== JSON.stringify(expectedSitemap)) {
  fail("sitemap public truth drift: " + JSON.stringify(sitemapUrls));
}
for (const bad of ["/ads","/l/","/auth/","/wallet/","/trades/","/profits","/dev/","/admin/","/me/inbox","/me/settings","/me/legal/license","/kyb/"]) {
  if (sitemapUrls.some((u) => u.startsWith(bad))) fail("sitemap contains private/noindex route: " + bad);
}

for (const rel of [
  "apps/web/app/ads/page.tsx",
  "apps/web/app/ads/[variant]/page.tsx",
  "apps/web/app/l/[variant]/page.tsx",
]) {
  const page = read(rel);
  if (!page.includes("robots: { index: false, follow: true }")) fail(rel + " must set index=false follow=true");
}
const licensePage = read("apps/web/app/me/legal/license/page.tsx");
if (!licensePage.includes("robots: { index: false, follow: true }")) {
  fail("/me/legal/license must remain noindex until official DET verification");
}

if (manifest.includes("AI가 찾아주는 글로벌 수익 기회")) fail("manifest reintroduced old high-risk machine copy");
if (!manifest.includes("AI 기반 글로벌 시세·가격 비교 및 동일상품 매칭 플랫폼")) {
  fail("manifest neutral public identity copy missing");
}

const acquisitionHay = [guestChrome, guestFirst, landingCopy].join("\n");
for (const word of ["원금", "예상 수익", "보장", "차익", "투자", "재테크"]) {
  if (acquisitionHay.includes(word)) fail("guest/acquisition copy contains banned wording: " + word);
}
if (/공식 협력|공식 협력사/.test(trustCopy)) {
  fail("public trust copy must not claim official commercial partnership without evidence");
}
if (/손해 없이|잔액 그대로/.test(trustCopy)) fail("safe-stop copy must not imply no-loss guarantee");
if (/입금은 내 지갑|입금금을 가져가지 않/.test(trustCopy)) {
  fail("custody copy must not imply unverified self-custody/no-take claim");
}
if (/허가 업종:\s*시계|AI 시세 기회 안내·거래 지원/.test(operatorCopy)) {
  fail("operator public copy must not present unverified expanded activities as licensed facts");
}

for (const needle of [
  '<meta name="robots" content="noindex,nofollow" />',
  "DET 공식 확인 필요",
  "공식 정부 증명서가 아닙니다",
]) {
  if (!publicLicense.includes(needle)) fail("KYB summary hardening missing: " + needle);
}
for (const banned of [
  "ACTIVE · 유효",
  "Status: Active",
  "Licensed Activities / 허가 업종",
  'class="emblem"',
  "AI Profit OS",
  "Trading cards and collectibles trading",
  "AI market opportunity guidance and trade support",
]) {
  if (publicLicense.includes(banned)) fail("KYB summary contains unverified/misleading signal: " + banned);
}

if (fails.length) {
  console.error("[verify:seo-schema] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:seo-schema] PASS — PUTDUK entity · sitemap/robots/noindex · JSON-LD anti-fraud · DET/partner/acquisition truth locks");
