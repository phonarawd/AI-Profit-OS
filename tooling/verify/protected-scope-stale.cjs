/**
 * verify:protected-scope-stale — REL-503
 * 마지막 인증 스냅샷과 live hash가 다르면 STALE.
 * 의도적 1파일 변경이 stale을 만든다. 은폐 금지.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const {
  readJson,
  buildManifest,
  sha256Buffer,
} = require(path.join(root, "tooling/engine-acceptance/lib/hash-scope.cjs"));

const files = [
  "governance/engine-acceptance/protected-scope.v1.json",
  "governance/engine-acceptance/baseline.v1.json",
  "governance/release-master/REL-503-PROTECTED-SCOPE-WATCH.md",
  ".github/workflows/protected-scope-stale.yml",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fails.push(`missing: ${f}`);
}

const pkg = read("package.json");
if (!pkg.includes('"verify:protected-scope-stale"')) {
  fails.push("package.json missing verify:protected-scope-stale");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("protected-scope-stale")) {
  fails.push("CATALOG.md must list protected-scope-stale");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("protected-scope-stale.cjs")) {
  fails.push("domain-by-path must trigger protected-scope-stale");
}

if (fails.length === 0) {
  const scope = readJson("governance/engine-acceptance/protected-scope.v1.json");
  const baseline = readJson("governance/engine-acceptance/baseline.v1.json");
  const live = buildManifest(scope);
  const drifted =
    live.aggregate !== baseline.protected_scope_manifest.aggregate;

  const mutated = {
    ...live,
    entries: live.entries.map((e, i) =>
      i === 0
        ? {
            ...e,
            sha256: crypto
              .createHash("sha256")
              .update(`${e.sha256}:intentional-stale`)
              .digest("hex"),
          }
        : e,
    ),
  };
  const mutatedAgg = sha256Buffer(
    Buffer.from(
      mutated.entries.map((e) => `${e.path}\0${e.sha256}\n`).join(""),
      "utf8",
    ),
  );
  if (mutatedAgg === live.aggregate) {
    fails.push("intentional 1-file mutation did not change aggregate");
  }

  const doc = read("governance/release-master/REL-503-PROTECTED-SCOPE-WATCH.md");
  if (!/STALE이면 REL-502/.test(doc)) {
    fails.push("watch doc must send STALE back to REL-502");
  }
  if (!drifted && !/SNAPSHOT_EQUALS_LIVE/.test(doc)) {
    fails.push("live equals baseline but watch doc does not explain it");
  }

  if (fails.length === 0) {
    console.log(
      `[verify:protected-scope-stale] PASS (watch live · drifted=${drifted} · synthetic mutation stale)`,
    );
    console.log(` - baseline=${baseline.protected_scope_manifest.aggregate}`);
    console.log(` - live=${live.aggregate}`);
    console.log(` - synthetic=${mutatedAgg}`);
    process.exit(0);
  }
}

console.error("[verify:protected-scope-stale] FAIL");
for (const f of fails) console.error(" -", f);
process.exit(1);
