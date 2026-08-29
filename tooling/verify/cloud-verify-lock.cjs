/**
 * 저사양 PC의 클라우드 검증 대체 경로가 레포에 살아 있는지 잠근다.
 * 배포 워크플로를 검증 경로로 쓰지 않는다.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

mustExist(".github/workflows/cloud-verify.yml");
mustExist("tooling/verify/cloud-dispatch.cjs");
mustExist(".devcontainer/devcontainer.json");

const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/cloud-verify.yml"),
  "utf8"
);
const forbidden = [
  "wrangler pages deploy",
  "opennextjs-cloudflare deploy",
  "supabase db",
  "apply_migration",
  "service_role",
];
for (const needle of forbidden) {
  if (workflow.includes(needle)) {
    fails.push(`cloud-verify.yml must not contain ${needle}`);
  }
}
if (!workflow.includes("pnpm install --frozen-lockfile")) {
  fails.push("cloud-verify.yml must install with --frozen-lockfile");
}
if (!workflow.includes("pnpm verify:gate")) {
  fails.push("cloud-verify.yml must run verify:gate for full/ui");
}
if (!workflow.includes("AI_CHAT_RELEASE_READY=NO")) {
  fails.push("cloud-verify.yml must keep AI_CHAT_RELEASE_READY=NO");
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.scripts?.["verify:cloud"] !== "node tooling/verify/cloud-dispatch.cjs") {
  fails.push("package.json verify:cloud must call cloud-dispatch.cjs");
}

if (fails.length) {
  console.error("[verify:cloud-verify-lock] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:cloud-verify-lock] PASS");
