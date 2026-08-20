/**
 * verify:settlement-rule-parity — REL-008
 * 동일 golden vector를 settlement_rule.cjs 와 settlement_rule.rs 에 넣고 결과를 비교한다.
 * cargo build --release 금지. 공식 임의 변경 금지. REL-502 대체 주장 0.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const rustRel = "services/engine-rust/src/settlement_rule.rs";
const cjsRel = "services/engine-rust/settlement_rule.cjs";
const goldenDir = "services/engine-rust/testdata/golden";

const goldenFiles = [
  ["g_match_success", "match_success.json"],
  ["g_price_moved_stale", "price_moved_stale.json"],
  ["g_below_min_profit", "below_min_profit.json"],
  ["g_circuit_open", "circuit_open.json"],
  ["g_requeue_then_success", "requeue_then_success.json"],
  ["g_soft_version_ok", "soft_version_ok.json"],
  ["g_strictness_tight_below_min", "g_strictness_tight_below_min.json"],
  ["g_strictness_lenient_ok", "g_strictness_lenient_ok.json"],
];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist(rustRel);
mustExist(cjsRel);
for (const [, file] of goldenFiles) {
  mustExist(path.join(goldenDir, file));
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
const catalog = fs.readFileSync(path.join(root, "tooling/verify/CATALOG.md"), "utf8");
const tiers = fs.readFileSync(path.join(root, "tooling/verify/gate-tiers.cjs"), "utf8");
const domain = fs.readFileSync(
  path.join(root, "tooling/verify/domain-by-path.cjs"),
  "utf8",
);

if (!pkg.includes('"verify:settlement-rule-parity"')) {
  fails.push("package.json missing verify:settlement-rule-parity");
}
if (!catalog.includes("settlement-rule-parity")) {
  fails.push("CATALOG.md must list settlement-rule-parity");
}
if (!tiers.includes("settlement-rule-parity.cjs")) {
  fails.push("gate-tiers T0/T1 must include settlement-rule-parity.cjs");
}
if (!domain.includes("settlement-rule-parity.cjs")) {
  fails.push("domain-by-path must trigger settlement-rule-parity");
}

const rustSrc = fs.readFileSync(path.join(root, rustRel), "utf8");
if (!rustSrc.includes("fn golden_vector_parity")) {
  fails.push("settlement_rule.rs must include golden_vector_parity test");
}
if (/cargo build --release/.test(rustSrc)) {
  fails.push("parity must not invoke cargo build --release");
}

if (fails.length) {
  console.error("[verify:settlement-rule-parity] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const rule = require(path.join(root, cjsRel));

/** @type {Map<string, string>} */
const cjsByKey = new Map();
/** @type {Map<string, string>} */
const expectByKey = new Map();

function evalCjs(ctx) {
  return rule.evaluateExecution(ctx);
}

for (const [id, file] of goldenFiles) {
  const g = JSON.parse(fs.readFileSync(path.join(root, goldenDir, file), "utf8"));
  if (g.id !== id) fails.push(`${file} id want ${id} got ${g.id}`);
  if (Array.isArray(g.steps)) {
    g.steps.forEach((step, i) => {
      const key = `${id}\t${i}`;
      const got = evalCjs(step.context);
      cjsByKey.set(key, got);
      expectByKey.set(key, step.expect);
      if (got !== step.expect) {
        fails.push(`cjs ${key} got ${got} want ${step.expect}`);
      }
    });
  } else {
    const key = `${id}\t0`;
    const got = evalCjs(g.context);
    cjsByKey.set(key, got);
    expectByKey.set(key, g.expect);
    if (got !== g.expect) {
      fails.push(`cjs ${key} got ${got} want ${g.expect}`);
    }
  }
}

const cargo = spawnSync(
  "cargo",
  [
    "test",
    "--manifest-path",
    path.join(root, "services/engine-rust/Cargo.toml"),
    "--lib",
    "--offline",
    "--",
    "settlement_rule::tests::golden_vector_parity",
    "--exact",
    "--nocapture",
  ],
  {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      CARGO_TERM_COLOR: "never",
    },
    timeout: 180_000,
  },
);

if (cargo.error) {
  if (cargo.error.code === "ENOENT") {
    fails.push("cargo not found — rust/js parity cannot be proven");
  } else {
    fails.push(`cargo spawn error: ${cargo.error.message}`);
  }
} else if (cargo.status !== 0) {
  const offlineFail =
    /unable to get packages from source|offline mode|failed to download/i.test(
      `${cargo.stdout}\n${cargo.stderr}`,
    );
  if (offlineFail) {
    const online = spawnSync(
      "cargo",
      [
        "test",
        "--manifest-path",
        path.join(root, "services/engine-rust/Cargo.toml"),
        "--lib",
        "--",
        "settlement_rule::tests::golden_vector_parity",
        "--exact",
        "--nocapture",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          CARGO_TERM_COLOR: "never",
        },
        timeout: 180_000,
      },
    );
    if (online.error || online.status !== 0) {
      fails.push(
        `cargo test FAIL\n${online.stdout || ""}\n${online.stderr || cargo.stderr || ""}`.trim(),
      );
    } else {
      cargo.stdout = online.stdout;
      cargo.stderr = online.stderr;
      cargo.status = 0;
    }
  } else {
    fails.push(
      `cargo test FAIL\n${cargo.stdout || ""}\n${cargo.stderr || ""}`.trim(),
    );
  }
}

const rustOut = `${cargo.stdout || ""}\n${cargo.stderr || ""}`;
if (/cargo build --release/.test(rustOut)) {
  fails.push("parity invoked cargo build --release");
}

/** @type {Map<string, string>} */
const rustByKey = new Map();
for (const line of rustOut.split(/\r?\n/)) {
  const m = /^PARITY\t([^\t]+)\t(\d+)\t(\S+)\s*$/.exec(line);
  if (!m) continue;
  rustByKey.set(`${m[1]}\t${m[2]}`, m[3]);
}

if (cargo.status === 0 && rustByKey.size === 0) {
  fails.push("rust test printed 0 PARITY lines (--nocapture required)");
}

for (const key of expectByKey.keys()) {
  const cjs = cjsByKey.get(key);
  const rust = rustByKey.get(key);
  const expect = expectByKey.get(key);
  if (rust == null) {
    fails.push(`rust missing vector ${key}`);
    continue;
  }
  if (cjs !== rust) {
    fails.push(`parity mismatch ${key} cjs=${cjs} rust=${rust} expect=${expect}`);
  }
}

for (const key of rustByKey.keys()) {
  if (!expectByKey.has(key)) {
    fails.push(`rust extra vector ${key}`);
  }
}

if (fails.length) {
  console.error("[verify:settlement-rule-parity] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  `[verify:settlement-rule-parity] PASS (${expectByKey.size} vectors · rust==cjs · T0/T1 wired · REL-502 대체 0)`,
);
