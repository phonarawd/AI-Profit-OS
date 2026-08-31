"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const PINS = require("../../governance/security/workflow-action-pins.v1.json");
const HOLD = new Set(["engine-acceptance.yml", "ebay-fault-injection.yml"]);

const REPLACERS = [
  ["actions/checkout@v6", `actions/checkout@${PINS.pins["actions/checkout@v6"]} # v6`],
  ["pnpm/action-setup@v6", `pnpm/action-setup@${PINS.pins["pnpm/action-setup@v6"]} # v6`],
  ["actions/setup-node@v6", `actions/setup-node@${PINS.pins["actions/setup-node@v6"]} # v6`],
  ["actions/upload-artifact@v4", `actions/upload-artifact@${PINS.pins["actions/upload-artifact@v4"]} # v4`],
  ["actions/download-artifact@v4", `actions/download-artifact@${PINS.pins["actions/download-artifact@v4"]} # v4`],
  ["dtolnay/rust-toolchain@stable", `dtolnay/rust-toolchain@${PINS.pins["dtolnay/rust-toolchain@stable"]} # stable`],
];

function extraPermissions(name) {
  if (name === "release-acceptance.yml") {
    return "permissions:\n  contents: read\n  actions: read\n";
  }
  return "permissions:\n  contents: read\n";
}

function insertPermissions(text, fileName) {
  if (/^permissions:/m.test(text)) return text;
  const block = extraPermissions(fileName);
  const nameOnly = text.match(/^(name:\s+.+\r?\n)(\r?\n)?/m);
  if (nameOnly && nameOnly.index === 0) {
    return nameOnly[1] + "\n" + block + (nameOnly[2] || "\n") + text.slice(nameOnly[0].length);
  }
  const m = text.match(/^(name:\s+.+\r?\n)/m);
  if (!m) throw new Error("no name: in " + fileName);
  return text.slice(0, m.index + m[1].length) + "\n" + block + "\n" + text.slice(m.index + m[1].length);
}

function pinUses(text) {
  let out = text;
  for (const [from, to] of REPLACERS) {
    out = out.split(from).join(to);
  }
  return out;
}

function main() {
  const dir = path.join(ROOT, ".github/workflows");
  const files = fs.readdirSync(dir).filter((n) => n.endsWith(".yml"));
  for (const name of files) {
    if (HOLD.has(name)) {
      process.stdout.write("HOLD " + name + "\n");
      continue;
    }
    const abs = path.join(dir, name);
    const before = fs.readFileSync(abs, "utf8");
    const after = insertPermissions(pinUses(before), name);
    if (after !== before) {
      fs.writeFileSync(abs, after);
      process.stdout.write("PIN " + name + "\n");
    } else {
      process.stdout.write("SKIP " + name + "\n");
    }
  }
}

main();
