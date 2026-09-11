/**
 * verify:rust-engine — services/engine-rust Rule Engine (CI job `rust-engine` · T2).
 * cargo fmt --check · cargo clippy --locked -D warnings · cargo check --locked · cargo test --locked 를 모두 실행하고
 * 각 결과를 보고한다. 하나라도 실패하면 exit 1 (첫 실패에서 멈추지 않는다 — 실패 원인이 전부 보이도록).
 * 로컬(Phase0 저사양)에서는 cargo check 만 권장 · 이 래퍼는 CI 전용 (T2).
 */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const crate = path.join(root, "services/engine-rust");
const tag = "[verify:rust-engine]";

const steps = [
  { id: "fmt", args: ["fmt", "--", "--check"] },
  { id: "clippy", args: ["clippy", "--locked", "--", "-D", "warnings"] },
  { id: "check", args: ["check", "--locked"] },
  { id: "test", args: ["test", "--locked"] },
];

const results = [];
for (const step of steps) {
  const started = Date.now();
  const r = spawnSync("cargo", step.args, { cwd: crate, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  const ok = r.status === 0;
  results.push({ id: step.id, ok, elapsed, status: r.status });
  console.log(tag + " " + (ok ? "ok  " : "FAIL") + " cargo " + step.args.join(" ") + " (" + elapsed + "s)");
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(tag + " FAIL (" + failed.map((f) => f.id).join(", ") + ")");
  process.exit(1);
}
console.log(tag + " PASS (fmt · clippy -D warnings · check --locked · test --locked)");
