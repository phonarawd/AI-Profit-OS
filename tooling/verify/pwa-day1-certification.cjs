/**
 * verify:pwa-day1-certification — REL-023 / E-PWA-007
 * 014/020/021/022 미완료면 인증서 발급 금지.
 * store-bridge / POST-017 포함 금지.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const required = [
  "governance/pwa/DAY1_CERTIFICATION.md",
  "governance/pwa/day1-checklist.v1.json",
  "governance/release-master/REL-014-PWA-NATIVE-SHELL.md",
  "governance/release-master/REL-020-PUSH-BADGE.md",
  "governance/release-master/REL-021-PUSH-CHANNEL-FILTER.md",
  "governance/release-master/REL-022-WEBAUTHN-UX.md",
  "tooling/pwa/pwa-day1-certification-harness.cjs",
  "tooling/pwa/pwa-day1-certification.spec.cjs",
  "tooling/pwa/lighthouse-pwa.ci.cjs",
];
for (const rel of required) read(rel);

const cert = read("governance/pwa/DAY1_CERTIFICATION.md");
if (cert && !cert.includes("STATUS = ISSUED")) {
  fails.push("EXIT_GATE: certification must be ISSUED only after deps complete");
}
if (cert && /POST-017|store-bridge PASS|TWA|Capacitor|uptodown/i.test(cert) && !cert.includes("store-bridge = 0")) {
  fails.push("cert must not include store-bridge/POST-017");
}
for (const item of [
  "manifest",
  "install",
  "offline",
  "push_dedup",
  "webauthn",
  "reduced_motion",
  "badge",
  "kill",
]) {
  if (cert && !cert.includes(`${item} = PASS`)) {
    fails.push(`cert missing ${item} = PASS`);
  }
}

const { runDay1CertCases } = require(
  path.join(root, "tooling/pwa/pwa-day1-certification-harness.cjs"),
);
const cases = runDay1CertCases();
for (const id of cases.checklist.requiredCompleted) {
  if (cases.evidence[id] !== true) {
    fails.push(`EXIT_GATE: ${id} evidence missing — cert forbidden`);
  }
}
for (const key of cases.checklist.items) {
  if (cases.items[key] !== true) {
    fails.push(`known defect: ${key}`);
  }
}
if (cases.storeBridge !== 0 || cases.post017 !== 0 || cases.storeBridgeLeak) {
  fails.push("VERIFY: store-bridge must stay excluded");
}

const children = [
  "pwa-native-shell.cjs",
  "pwa-push-badge.cjs",
  "push-channel-prefs.cjs",
  "webauthn-ux-rp.cjs",
];
for (const script of children) {
  const r = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
    cwd: root,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    fails.push(`regression ${script}`);
    if (r.stderr) fails.push(String(r.stderr).trim().slice(0, 400));
  }
}

const lh = spawnSync(
  process.execPath,
  [path.join(root, "tooling/pwa/lighthouse-pwa.ci.cjs")],
  { cwd: root, encoding: "utf8" },
);
if (lh.status !== 0 || !String(lh.stdout || "").includes("PASS")) {
  fails.push("lighthouse static PWA audit failed");
}

const spec = spawnSync(
  process.execPath,
  [path.join(root, "tooling/pwa/pwa-day1-certification.spec.cjs")],
  { cwd: root, encoding: "utf8" },
);
if (spec.status !== 0 || !String(spec.stdout || "").includes("PASS")) {
  fails.push("committed certification spec failed");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (pkg && !pkg.includes('"verify:pwa-day1-certification"')) {
  fails.push("package.json missing verify:pwa-day1-certification");
}
if (catalog && !catalog.includes("pwa-day1-certification")) {
  fails.push("CATALOG.md must list pwa-day1-certification");
}
if (domain && !domain.includes("pwa-day1-certification.cjs")) {
  fails.push("domain-by-path must trigger pwa-day1-certification");
}

if (fails.length) {
  console.error("[verify:pwa-day1-certification] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  "[verify:pwa-day1-certification] PASS (014/020/021/022 · checklist 8 · store-bridge 0)",
);
