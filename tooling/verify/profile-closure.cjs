"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { runAccountSpec, shouldSkipBrowser } = require("./lib/run-account-spec.cjs");
const root = path.resolve(__dirname, "../..");
const fails = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const client = read("apps/web/app/me/ProfileClient.tsx");
if (!client.includes("fetchAuthSession")) fails.push("profile must use fetchAuthSession");
if (client.includes("SafeStopTrustMetric")) fails.push("profile must not invent SafeStop zeros");
if (!read("package.json").includes('"verify:profile-closure"')) fails.push("missing script");
if (!read("tooling/verify/CATALOG.md").includes("profile-closure")) fails.push("missing catalog");
function done(extra) {
  if (fails.length) {
    console.error("[verify:profile-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[verify:profile-closure] PASS" + (extra ? ` · ${extra}` : ""));
}
if (shouldSkipBrowser("PROFILE_CLOSURE_STATIC_ONLY")) {
  done(process.env.CI ? "ci-static" : "static-only");
  process.exit(0);
}
runAccountSpec("profile-closure.spec.cjs")
  .then((result) => {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) fails.push("profile-closure runtime failed");
    done("browser");
  })
  .catch((err) => {
    fails.push(String(err.message || err));
    done("browser");
  });
