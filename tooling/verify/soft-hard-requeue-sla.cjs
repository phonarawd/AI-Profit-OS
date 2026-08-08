/**
 * verify:soft-hard-requeue-sla — Index §20.2 · Engine §48.13 · UI §48
 * Soft60/Hard90 · 카피3줄 · MATCH_TIMEOUT · presentation≠SLA · 전등급동일
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const execPath = path.join(root, "packages/ui/copy/ko/execution.ts");
if (!fs.existsSync(execPath)) {
  console.error("[verify:soft-hard-requeue-sla] FAIL missing execution.ts");
  process.exit(1);
}
const src = fs.readFileSync(execPath, "utf8");

function lock(key, want) {
  const re = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`);
  const m = src.match(re);
  if (!m) fails.push(`missing key ${key}`);
  else if (m[1] !== want) fails.push(`${key} want "${want}" got "${m[1]}"`);
}

lock("slaSoftHint", "보통 1분 안에 결과가 나와요");
lock("requeueHint", "조건을 다시 맞추는 중이에요 · 손댈 것 없음");
lock("matchTimeout", "시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요");

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
  if (running.softHard?.softSec !== 60) fails.push("softSec must be 60");
  if (running.softHard?.hardSec !== 90) fails.push("hardSec must be 90");
  if (running.softHard?.membershipUniform !== true) {
    fails.push("membershipUniform must be true");
  }
  const ids = (running.blocks || []).map((b) => b.id);
  for (const id of ["slaSoftHint", "requeueHint"]) {
    if (!ids.includes(id)) fails.push(`running missing block ${id}`);
  }
}

if (!fs.existsSync(safePath)) {
  fails.push("missing execution-safe-stop.wire.json");
} else {
  const safe = JSON.parse(fs.readFileSync(safePath, "utf8"));
  const mt = (safe.blocks || []).find((b) => b.id === "matchTimeout");
  if (!mt || mt.copyKey !== "T.execution.matchTimeout") {
    fails.push("safe-stop must wire MATCH_TIMEOUT → T.execution.matchTimeout");
  }
  if (mt && mt.when !== "result=MATCH_TIMEOUT") {
    fails.push('matchTimeout.when must be result=MATCH_TIMEOUT');
  }
}

if (fails.length) {
  console.error("[verify:soft-hard-requeue-sla] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:soft-hard-requeue-sla] PASS (Soft60/Hard90 · 카피3줄 · MATCH_TIMEOUT)");
