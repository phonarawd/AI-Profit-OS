/**
 * full-product Axe inventory must name unlocked product + admin routes.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const inventory = JSON.parse(
  fs.readFileSync(
    path.join(root, "tooling/e2e/fixtures/full-product-axe-inventory.v1.json"),
    "utf8",
  ),
);
const spec = fs.readFileSync(
  path.join(root, "tooling/e2e/specs/full-product-axe.spec.cjs"),
  "utf8",
);
const adminSpec = fs.readFileSync(
  path.join(root, "tooling/e2e/specs/full-product-axe-admin.spec.cjs"),
  "utf8",
);
const axeYml = fs.readFileSync(
  path.join(root, ".github/workflows/critical-axe.yml"),
  "utf8",
);

const requiredWeb = [
  "/",
  "/profits",
  "/wallet",
  "/wallet/deposit?tab=usdt",
  "/wallet/withdraw",
  "/wallet/history",
  "/me/settings",
  "/me",
];
for (const route of requiredWeb) {
  if (!(inventory.web || []).some((item) => item.path === route)) {
    fails.push("inventory missing web " + route);
  }
}
if (!(inventory.admin || []).some((item) => item.path === "/admin/system-control")) {
  fails.push("inventory missing admin system-control");
}
if (!spec.includes("full-product-axe-inventory.v1.json")) {
  fails.push("web spec must read the inventory");
}
if (!adminSpec.includes("inventory.admin")) {
  fails.push("admin spec must sweep inventory.admin");
}
if (!axeYml.includes("full-product-axe.spec.cjs")) {
  fails.push("critical-axe.yml must run full-product web axe");
}
if (!axeYml.includes("full-product-axe-admin.spec.cjs")) {
  fails.push("critical-axe.yml must run full-product admin axe");
}

if (fails.length) {
  console.error("[verify:full-product-axe-inventory] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:full-product-axe-inventory] PASS");
