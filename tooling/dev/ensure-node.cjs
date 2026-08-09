#!/usr/bin/env node
/** Fail fast when Node is outside engines.node (ADR-015). */
const { readFileSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..", "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const spec = pkg.engines?.node ?? ">=22.14.0 <23";
const major = Number(process.versions.node.split(".")[0]);

if (major !== 22) {
  console.error(
    `[dev] FAIL: Node ${process.version} — need ${spec}\n` +
      "  Windows: fnm install 22.14.0 && fnm use 22.14.0\n" +
      "  Or open a new terminal after fnm profile setup (tooling/dev/setup-fnm-profile.ps1)",
  );
  process.exit(1);
}
