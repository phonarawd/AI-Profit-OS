#!/usr/bin/env node
/**
 * Fill ONLY missing TRON local secrets (keeps existing).
 * Never echoes secret values.
 */
const readline = require("readline");
const crypto = require("crypto");
const {
  LOCAL_ENV_FILE,
  readEnvFile,
  writeEnvFile,
  assertGitIgnored,
  maskStatus,
  ROOT,
} = require("./lib/local-env.cjs");

function ask(rl, prompt) {
  return new Promise((resolve) => {
    // Prefer muted stdin on Windows terminals (avoid echo into transcript/logs).
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    const mute =
      stdin.isTTY &&
      typeof stdin.setRawMode === "function" &&
      process.stdout.isTTY;
    if (!mute) {
      rl.question(prompt, (ans) => resolve(String(ans || "").trim()));
      return;
    }
    process.stdout.write(prompt);
    let buf = "";
    const onData = (chunk) => {
      const s = chunk.toString("utf8");
      for (const ch of s) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(Boolean(wasRaw));
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(buf.trim());
          return;
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u007f" || ch === "\b") {
          buf = buf.slice(0, -1);
          continue;
        }
        buf += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("=== 퍼뜩 TRON setup (missing only) ===");
  console.log("repo:", ROOT);
  console.log("file:", LOCAL_ENV_FILE);
  const next = { ...readEnvFile(LOCAL_ENV_FILE) };
  if (!next.TRONGRID_BASE_URL) next.TRONGRID_BASE_URL = "https://api.trongrid.io";
  if (!next.WALLET_TICK_SCHEDULER) next.WALLET_TICK_SCHEDULER = "1";
  if (!next.INTERNAL_WALLET_TICK_TOKEN) {
    next.INTERNAL_WALLET_TICK_TOKEN = crypto.randomBytes(24).toString("hex");
  }
  console.log("현재:", JSON.stringify(maskStatus(next)));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async function need(key, prompt, validate) {
    if (next[key]) {
      console.log(`- ${key}: 이미 set (유지)`);
      return;
    }
    const v = await ask(rl, prompt);
    if (!v) {
      console.error(`필수: ${key}`);
      process.exit(1);
    }
    if (validate && !validate(v)) {
      console.error(`형식 오류: ${key}`);
      process.exit(1);
    }
    next[key] = v;
  }

  await need("TRONGRID_API_KEY", "TronGrid Production API Key: ");
  await need("TATUM_MAINNET_API_KEY", "Tatum Mainnet API Key (t-...): ", (v) =>
    /^t-/i.test(v),
  );
  await need("TATUM_TESTNET_API_KEY", "Tatum Testnet API Key (t-...): ", (v) =>
    /^t-/i.test(v),
  );
  await need(
    "TRON_TREASURY_ADDRESS",
    "TronLink Treasury 공개 주소 (T...): ",
    (v) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v),
  );

  rl.close();
  writeEnvFile(LOCAL_ENV_FILE, next);
  console.log("gitignore:", assertGitIgnored(".env.tron.local").split("\n")[0]);
  console.log("저장 완료:", JSON.stringify(maskStatus(next)));
  console.log("다음: pnpm tron:bootstrap");
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
