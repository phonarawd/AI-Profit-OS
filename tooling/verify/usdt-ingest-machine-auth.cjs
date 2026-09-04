/**
 * USDT ingest — machine-auth POST · address-index owner only · body.userId ignore.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const controller = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/wallet.controller.ts"),
  "utf8",
);
const usdt = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/usdt-deposit.service.ts"),
  "utf8",
);
const watcher = fs.readFileSync(
  path.join(root, "services/api-nest/src/wallet/chain-watcher.phase0.service.ts"),
  "utf8",
);

for (const route of [
  "observeUsdtDeposit",
  "chainWatcherTick",
  "chainSweeperTick",
]) {
  const at = controller.indexOf(route + "(");
  assert.ok(at >= 0, route + " missing");
  const window = controller.slice(at, at + 900);
  assert.match(window, /assertInternalWalletTickAuth\(headerToken\)/);
  assert.match(window, /x-internal-wallet-token/);
}

assert.doesNotMatch(
  controller,
  /userId:\s*typeof body\.userId === "string"/,
);
const observeStart = usdt.indexOf("async observe(");
const observeEnd = usdt.indexOf("\n  private async creditLedger", observeStart);
assert.ok(observeStart >= 0 && observeEnd > observeStart, "observe method missing");
const observeBody = usdt.slice(observeStart, observeEnd);
assert.doesNotMatch(observeBody, /input\.userId/);
assert.match(observeBody, /resolveUserIdByAddress\(toAddress\)/);
assert.doesNotMatch(watcher, /userId,\s*\n\s*\}\);/);

console.log(
  "[verify:usdt-ingest-machine-auth] PASS (MACHINE_AUTH_POSTS · ADDRESS_OWNER_ONLY · BODY_USER_ID_IGNORED)",
);
