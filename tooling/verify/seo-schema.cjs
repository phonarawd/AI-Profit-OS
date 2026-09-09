/**
 * verify:seo-schema — public SEO is 퍼뜩 facts only.
 * Fake ratings, invented opportunity URLs, AI Profit OS on consumer surface = FAIL.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

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

const robots = read("apps/web/app/robots.ts");
const sitemap = read("apps/web/app/sitemap.ts");
const layout = read("apps/web/app/layout.tsx");
const adminRobots = read("apps/admin/app/robots.ts");

if (!robots.includes("app.hiptk.app")) fail("web robots must name app.hiptk.app");
if (robots.includes("hitpk.app")) fail("web robots must not use hitpk typo");
if (!robots.includes("/wallet/") || !robots.includes("/trades/")) {
  fail("web robots must disallow money/session routes");
}
if (!sitemap.includes("${APP_ORIGIN}/profits") && !sitemap.includes("/profits")) {
  fail("sitemap must include the public profits index");
}
if (sitemap.includes("/profits/")) {
  fail("sitemap must not invent per-opportunity URLs");
}
if (sitemap.includes("/wallet") || sitemap.includes("/trades/")) {
  fail("sitemap must not list wallet or trade URLs");
}
if (!layout.includes("metadataBase") || !layout.includes("application/ld+json")) {
  fail("layout must set metadataBase and JSON-LD");
}
if (/aggregateRating|reviewCount/.test(layout + sitemap + robots)) {
  fail("must not publish fake aggregateRating");
}
if (/AI Profit OS/.test(layout + robots + sitemap)) {
  fail("consumer SEO surfaces must not use AI Profit OS");
}
if (!/disallow:\s*"\/"/.test(adminRobots)) {
  fail("admin robots must disallow all indexing");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:seo-schema"')) fail("package.json missing verify:seo-schema");
if (!catalog.includes("seo-schema")) fail("CATALOG.md must list seo-schema");
if (!domain.includes("seo-schema.cjs")) fail("domain-by-path must trigger seo-schema.cjs");

if (fails.length) {
  console.error("[verify:seo-schema] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:seo-schema] PASS (퍼뜩 public facts · fake ratings 0)");
