/**
 * verify:admin-novice-ui — 초보 관리자용 셸·문구·접근성 회귀 차단
 * 내부 식별자와 주석은 허용하지만 실제 화면 문자열에는 개발 용어를 허용하지 않는다.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const failures = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    failures.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) failures.push(`${label} missing ${needle}`);
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function visibleTextCandidates(source) {
  const clean = stripComments(source);
  const strings = [];
  const regex = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of clean.matchAll(regex)) strings.push(match[2]);
  for (const match of clean.matchAll(/>([^<>{}]+)</g)) strings.push(match[1]);
  return strings.join("\n");
}

const shell = read("apps/admin/components/AdminShell.tsx");
for (const needle of [
  "admin-skip-link",
  "admin-primary-navigation",
  "aria-current",
  "aria-expanded",
  "admin-sidebar-close",
  "navigationGroups",
]) {
  requireText(shell, needle, "AdminShell");
}

const session = read("apps/admin/components/AdminSessionBar.tsx");
for (const needle of [
  'type="password"',
  "관리자 연결 코드",
  'role="status"',
  "connectAdminSession",
]) {
  requireText(session, needle, "AdminSessionBar");
}

const css = read("apps/admin/app/globals.css");
for (const needle of [
  ":focus-visible",
  "min-height: 2.75rem",
  "prefers-reduced-motion",
  ".admin-dashboard-grid",
  'button[data-tone="danger"]',
]) {
  requireText(css, needle, "admin styles");
}

const copy = read("packages/ui/copy/ko/admin.ts");
for (const needle of [
  'productName: "퍼뜩 운영센터"',
  'dashboard: "오늘 할 일"',
  'risk: "의심 거래 확인"',
  'systemControl: "서비스 긴급 멈춤"',
  'audit: "관리자 작업 기록"',
]) {
  requireText(copy, needle, "admin copy");
}

const uiFiles = [
  "packages/ui/copy/ko/admin.ts",
  "apps/admin/components/AdminShell.tsx",
  "apps/admin/components/AdminSessionBar.tsx",
  ...fs
    .readdirSync(path.join(root, "apps/admin/app/admin"), { recursive: true })
    .filter((entry) => entry.endsWith("page.tsx"))
    .map((entry) => path.join("apps/admin/app/admin", entry)),
];

const bannedVisibleTerms = [
  "API:",
  "KPI",
  "KYC",
  "RBAC",
  "JWT",
  "UUID",
  "Phase",
  "Asset Master",
  "SSE",
  "게이트",
  "버킷",
  "분개",
  "전표",
  "대사 리포트",
  "동결",
  "프롬프트",
  "토큰",
  "시뮬레이션",
  "멤버십 강제",
  "자본대",
  "실패율",
  "상품 마스터",
];

for (const rel of uiFiles) {
  const visibleStrings = visibleTextCandidates(read(rel));
  for (const term of bannedVisibleTerms) {
    if (visibleStrings.includes(term)) {
      failures.push(`${rel} exposes beginner-hostile term: ${term}`);
    }
  }
}

const truth = read("apps/admin/lib/admin-truth.ts");
requireText(truth, 'UNAVAILABLE_LABEL = "확인할 수 없음"', "admin truth");
requireText(truth, "readStatusLabel", "admin truth");
requireText(truth, "readMoneyRecordLabel", "admin truth");

if (failures.length) {
  console.error("[verify:admin-novice-ui] FAIL");
  for (const failure of failures) console.error(" -", failure);
  process.exit(1);
}

console.log("[verify:admin-novice-ui] PASS (plain Korean · responsive shell · a11y · truthful states)");
