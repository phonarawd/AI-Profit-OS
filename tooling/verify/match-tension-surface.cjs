/**
 * verify:match-tension-surface — Index §20.2 · UI §48.3b
 * Soft/Hard 전등급동일 · 카피3줄 · slaAlmost/priceNearMiss · 가짜대기/난수틱 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const execPath = path.join(root, "packages/ui/copy/ko/execution.ts");
if (!fs.existsSync(execPath)) {
  console.error("[verify:match-tension-surface] FAIL missing packages/ui/copy/ko/execution.ts");
  process.exit(1);
}
const src = fs.readFileSync(execPath, "utf8");

function lock(key, want) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const m = src.match(re);
  if (!m) fails.push(`missing key ${key}`);
  else if (m[1] !== want) fails.push(`${key} want "${want}" got "${m[1]}"`);
}

/** Soft/Hard 유저 카피 3줄 (v7.22.29) */
lock("slaSoftHint", "보통 1분 안에 결과가 나와요");
lock("requeueHint", "조건을 다시 맞추는 중이에요 · 손댈 것 없음");
lock("matchTimeout", "시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요");
/** §48.3b */
lock("slaAlmost", "거의 다 됐어요 · 마지막 조건 확인 중");
lock("priceNearMiss", "시세가 살짝 어긋났어요");

const runningPath = path.join(
  root,
  "packages/ui/canon/surfaces/execution-running.wire.json",
);
const safePath = path.join(
  root,
  "packages/ui/canon/surfaces/execution-safe-stop.wire.json",
);

if (!fs.existsSync(runningPath)) {
  fails.push("missing execution-running.wire.json");
} else {
  const running = JSON.parse(fs.readFileSync(runningPath, "utf8"));
  if (running.softHard?.softSec !== 60) fails.push("softHard.softSec must be 60");
  if (running.softHard?.hardSec !== 90) fails.push("softHard.hardSec must be 90");
  if (running.softHard?.membershipUniform !== true) {
    fails.push("softHard.membershipUniform must be true (전 등급 동일)");
  }
  const byId = Object.fromEntries((running.blocks || []).map((b) => [b.id, b]));
  for (const id of ["slaSoftHint", "requeueHint", "slaAlmost", "tensionBeats", "aiConfidence"]) {
    if (!byId[id]) fails.push(`execution-running missing block ${id}`);
  }
  if (byId.slaSoftHint?.copyKey !== "T.execution.slaSoftHint") {
    fails.push("slaSoftHint.copyKey mismatch");
  }
  if (byId.requeueHint?.copyKey !== "T.execution.requeueHint") {
    fails.push("requeueHint.copyKey mismatch");
  }
  if (byId.slaAlmost?.copyKey !== "T.execution.slaAlmost") {
    fails.push("slaAlmost.copyKey mismatch");
  }
  const forb = running.forbidden || [];
  for (const f of [
    "fake_match_waiters",
    "random_success_timer",
    "soft_hard_by_membership",
    "success_rate_percent",
  ]) {
    if (!forb.includes(f)) fails.push(`execution-running.forbidden missing ${f}`);
  }
}

if (!fs.existsSync(safePath)) {
  fails.push("missing execution-safe-stop.wire.json");
} else {
  const safe = JSON.parse(fs.readFileSync(safePath, "utf8"));
  const byId = Object.fromEntries((safe.blocks || []).map((b) => [b.id, b]));
  if (byId.matchTimeout?.copyKey !== "T.execution.matchTimeout") {
    fails.push("safe-stop matchTimeout.copyKey must be T.execution.matchTimeout");
  }
  if (byId.priceNearMiss?.copyKey !== "T.execution.priceNearMiss") {
    fails.push("safe-stop priceNearMiss.copyKey must be T.execution.priceNearMiss");
  }
}

if (fails.length) {
  console.error("[verify:match-tension-surface] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:match-tension-surface] PASS (Soft/Hard 3줄 · tension · 전등급동일)",
);
