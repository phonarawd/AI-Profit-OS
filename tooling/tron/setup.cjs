#!/usr/bin/env node
/** pnpm tron:setup — secrets never echoed. Writes .env.tron.local */
const readline = require("readline");
const crypto = require("crypto");
const {
  LOCAL_ENV_FILE,
  readEnvFile,
  writeEnvFile,
  assertGitIgnored,
  maskStatus,
} = require("./lib/local-env.cjs");

function ask(rl, prompt, { secret = false } = {}) {
  return new Promise((resolve) => {
    if (!secret || !process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      rl.question(prompt, (ans) => resolve(String(ans || "").trim()));
      return;
    }
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    process.stdout.write(prompt);
    let buf = "";
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (chunk) => {
      const s = chunk.toString("utf8");
      if (s === "\r" || s === "\n") {
        stdin.setRawMode(!!wasRaw);
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(buf.trim());
        return;
      }
      if (s === "\u0003") process.exit(1);
      if (s === "\u0008" || s === "\u007f") {
        buf = buf.slice(0, -1);
        return;
      }
      buf += s;
    };
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("=== 퍼뜩 TRON setup (로컬 전용 · Git 커밋 금지) ===");
  const existing = readEnvFile(LOCAL_ENV_FILE);
  console.log("현재 상태:", JSON.stringify(maskStatus(existing)));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const next = { ...existing };
  if (!next.TRONGRID_BASE_URL) next.TRONGRID_BASE_URL = "https://api.trongrid.io";
  if (!next.WALLET_TICK_SCHEDULER) next.WALLET_TICK_SCHEDULER = "1";
  if (!next.INTERNAL_WALLET_TICK_TOKEN) {
    next.INTERNAL_WALLET_TICK_TOKEN = crypto.randomBytes(24).toString("hex");
  }
  const overwrite =
    Object.values(maskStatus(existing)).some((v) => v === "set") &&
    (await ask(rl, "이미 값이 있습니다. 빈 입력=유지, yes=덮어쓰기: ")) === "yes";

  async function fill(key, prompt, { secret = true, required = true } = {}) {
    if (next[key] && !overwrite) {
      console.log(`- ${key}: 유지(set)`);
      return;
    }
    const v = await ask(rl, prompt, { secret });
    if (!v) {
      if (required && !next[key]) {
        console.error(`필수 값 없음: ${key}`);
        process.exit(1);
      }
      return;
    }
    next[key] = v;
  }

  await fill("TRONGRID_API_KEY", "TronGrid Production API Key 붙여넣기: ");
  await fill("TATUM_MAINNET_API_KEY", "Tatum Mainnet API Key 붙여넣기: ");
  await fill("TATUM_TESTNET_API_KEY", "Tatum Testnet API Key 붙여넣기: ");
  await fill("TRON_TREASURY_ADDRESS", "TronLink Treasury 공개 주소(T...) 붙여넣기: ", {
    secret: false,
  });
  rl.close();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(next.TRON_TREASURY_ADDRESS || "")) {
    console.error("Treasury 주소 형식이 올바르지 않습니다.");
    process.exit(1);
  }
  writeEnvFile(LOCAL_ENV_FILE, next);
  console.log("저장 완료: .env.tron.local");
  console.log("gitignore:", assertGitIgnored(".env.tron.local").split("\n")[0]);
  console.log("상태:", JSON.stringify(maskStatus(next)));
  console.log("다음: Docker Desktop 켠 뒤 pnpm tron:bootstrap");
}

main().catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
