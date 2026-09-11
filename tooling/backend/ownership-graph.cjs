#!/usr/bin/env node
"use strict";
/**
 * 백엔드 전용 레포 전환 · 1단계 — 전체 파일 소유권 그래프 생성기
 *
 *   node tooling/backend/ownership-graph.cjs            → 두 JSON 재생성
 *   node tooling/backend/ownership-graph.cjs --check    → 재생성 없이 UNKNOWN=0 · 결과 일치만 검사
 *
 * 입력  : `git ls-files` 전체 (작업트리 내용 · git 이력)
 * 출력  : quality/backend-file-ownership.json   (파일별 class · decision · evidence · mixedBreakdown)
 *         quality/backend-dependency-graph.json (nodes · edges)
 *
 * 원칙
 *  - 경로 이름만으로 판정하지 않는다. 판정 근거는 evidence[]에 자동 추출한다
 *    (import/require · 경로 리터럴 · package.json script/dep · workflow run/paths ·
 *     wrangler main/routes · docker · deploy · process.env · git 최근 변경 · Nest module 등록).
 *  - 결정 규칙(allowlist/denylist/휴리스틱)은 아래 데이터 상수로 노출한다.
 *    후속 `backend-repository-boundary` 검사가 `require()`해서 재사용할 수 있다.
 *  - 규칙만으로 못 정한 파일은 tooling/backend/ownership-overrides.json (수동 판정 + 근거)로 닫는다.
 *  - 최종 UNKNOWN = 0 이어야 하며, 남으면 exit 1.
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const OUT_OWNERSHIP = "quality/backend-file-ownership.json";
const OUT_GRAPH = "quality/backend-dependency-graph.json";
const OVERRIDES_REL = "tooling/backend/ownership-overrides.json";
/** quality/backend-*.json analysis artifacts (ownership · graph · boundary baseline) are never reference sources */
const ANALYSIS_ARTIFACT_RE = /^quality\/backend-[^/]*\.json$/;

// ───────────────────────────────────────────────────────────────────────────────
// 0. 분류 어휘 (SSOT)
// ───────────────────────────────────────────────────────────────────────────────
const CLASSES = Object.freeze([
  "BACKEND_RUNTIME",
  "BACKEND_CONTRACT",
  "BACKEND_TEST",
  "BACKEND_INFRA",
  "BACKEND_DOC",
  "CUSTOMER_WEB",
  "LEGACY_ADMIN_UI",
  "FUTURE_ADMIN_REQUIREMENT",
  "MIXED",
  "GENERATED",
  "OBSOLETE",
  "UNKNOWN",
]);
const DECISIONS = Object.freeze(["KEEP", "DELETE", "MOVE", "SPLIT"]);
const BACKEND_CLASSES = new Set([
  "BACKEND_RUNTIME",
  "BACKEND_CONTRACT",
  "BACKEND_TEST",
  "BACKEND_INFRA",
  "BACKEND_DOC",
]);
const UI_CLASSES = new Set(["CUSTOMER_WEB", "LEGACY_ADMIN_UI", "OBSOLETE"]);

/** 후속 단계 라벨 (코디네이터 예시 5·6·8·9·10 준수 · 4·7은 이 문서의 제안) */
const STAGE = Object.freeze({
  UI_TEST_REMOVAL: "4단계 UI 검증기·E2E 제거",
  MIXED_SPLIT: "5단계 mixed 분리",
  CI_REPLACE: "6단계 CI 교체",
  GOVERNANCE_EVIDENCE: "7단계 governance 증거 정리",
  PACKAGE_CLEANUP: "8단계 패키지 정리",
  CLOUDFLARE_RESIDUE: "9단계 Cloudflare 잔재",
  MARKDOWN_CLEANUP: "10단계 Markdown 정리",
  NONE: "-",
});

/**
 * 이 브랜치에서 이미 삭제된 UI 트리 (git log --diff-filter=D origin/main..HEAD 로 실측).
 * 런타임에 git으로 다시 계산하고, git 이력이 없을 때만 이 정적 목록을 쓴다.
 */
const DELETED_UI_PREFIXES_STATIC = Object.freeze(["apps/web/", "apps/admin/", "packages/ui/"]);

/** 고객 웹(putduk-web)로 이관되는 서버 클라이언트 · 브라우저 하네스 · UI 배포 경로 */
const UI_PATH_RULES = Object.freeze([
  { re: /^packages\/sdk\//, cls: "CUSTOMER_WEB" },
  { re: /^infra\/web\//, cls: "CUSTOMER_WEB" },
  { re: /^workers\/web-proxy\//, cls: "CUSTOMER_WEB" },
  { re: /^workers\/_shared\/opennext-origin\.ts$/, cls: "CUSTOMER_WEB" },
  { re: /^infra\/ops\//, cls: "LEGACY_ADMIN_UI" },
  { re: /^workers\/ops-proxy\//, cls: "LEGACY_ADMIN_UI" },
  { re: /^tooling\/perf\//, cls: "OBSOLETE" },
  { re: /^tooling\/verify\/responsive(\/|\.cjs$)/, cls: "OBSOLETE" },
  { re: /^tooling\/e2e\/playwright.*\.config\.cjs$/, cls: "OBSOLETE" },
  { re: /^tooling\/e2e\/lib\/(axe-scan|consumer-route-stubs|account-route-stubs|local-web-runtime|local-admin-runtime|production-loop)\.cjs$/, cls: "OBSOLETE" },
  { re: /^tooling\/e2e\/fixtures\/(axe-known-issues|full-product-axe-inventory)\.v1\.json$/, cls: "OBSOLETE" },
  { re: /^tooling\/scaffold\//, cls: "OBSOLETE" },
]);

/** governance 디렉터리 시드 (참조 그래프로 뒤집힐 수 있음) */
const GOVERNANCE_UI_DIRS = Object.freeze([
  "governance/consumer-home-approval/",
  "governance/figma/",
  "governance/visual-reconciliation/",
  "governance/performance/",
  "governance/platform-redesign/",
  "governance/responsive/",
  "governance/consumer-acquisition/",
]);
const GOVERNANCE_BACKEND_DIRS = Object.freeze([
  "governance/admin/",
  "governance/brand/",
  "governance/db-recon/",
  "governance/engine-acceptance/",
  "governance/observability/",
  "governance/global-product/",
  "governance/recovery/",
  "governance/release-inventory/",
  "governance/security/",
  "governance/release-master/evidence/",
  "governance/release-master/rel-b3-promotion/",
]);
/** release-master 제목 규칙 (고객 화면 REL-1xx · 어드민 화면 REL-20x · 웹 lint/axe/pwa/device/webauthn-ux · lighthouse · age cohort) */
const RELEASE_MASTER_UI_TITLE = /^governance\/release-master\/(REL-01[1-4]-|REL-01[89]-|REL-02[0-3]-|REL-1\d\d-|rel-1\d\d-|REL-20\d-|AGE_SPOTCHECK\.md|REL-404-)/;
const RELEASE_MASTER_BACKEND_TITLE = /^governance\/release-master\/(REL-01[5-7]-|REL-22[2-4]-|REL-40[235-9]-|REL-5\d\d-|REL-60[0-2]-|R7_|R8_|RC_FORMAL|MIGRATION_READINESS|PROD_READINESS|KAKAO_READINESS|ROLLBACK_RUNBOOK|SECURITY_BASELINE|VERSIONING|rc-formal|r8-cache|release-acceptance|release-artifact|staging-topology|versioning)/;

/** 백엔드 어서션 도메인 사전 (mixedBreakdown · 첫 매치 우선) */
const BACKEND_ASSERTION_DOMAINS = Object.freeze([
  { id: '인증·세션·쿠키', re: /(auth|session|cookie|jwt|oauth|kakao|google|passkey|webauthn|magic[- ]?link|turnstile|login|signup|logout|rate[- ]?limit|429|401|403)/i },
  { id: 'KYC 정책', re: /(kyc|identity|proof|r2[- ]only|document|여권|신분)/i },
  { id: '입출금·수수료', re: /(withdraw|deposit|fee|수수료|출금|입금|tron|usdt|krw|network|address|sweeper|watcher|min[- ]?holding|step[- ]?up)/i },
  { id: 'idempotency', re: /(idempoten|fingerprint|replay|double[- ]?submit|conflict|409)/i },
  { id: '원장', re: /(ledger|journal|bucket|posting|debit|credit|balance|settlement|정산|원장|outbox|잔액)/i },
  { id: '매칭 정책', re: /(match|strictness|requeue|sla|success[- ]?rule|rematch|stale|opportunit|participat|execute|execution|trade)/i },
  { id: '자본 구간', re: /(capital|band|tier|whale|micro|catalog)/i },
  { id: '연습 자금', re: /(practice|연습|non[- ]?withdrawable|sandbox)/i },
  { id: '멤버십', re: /(membership|grade|ladder|daily[- ]?cap|sprout|vip)/i },
  { id: '혜택·미션', re: /(benefit|mission|payout|referral|invite|share|pool|fifo|credit)/i },
  { id: '알림·푸시·인박스', re: /(notif|push|inbox|badge|vapid|prefs|channel|resend|email)/i },
  { id: 'AI 서버 호출 정책', re: /(coach|ai[- ]|llm|gemini|lane|router|fact|grounding|scope|guard|memory|persona|twin|prompt|sse)/i },
  { id: '감사 로그', re: /(audit|log|trace|append[- ]?only)/i },
  { id: '관리자 API·RBAC', re: /(admin|rbac|role|operator|kill[- ]?switch|override|ops|intent|policy[- ]?version|controller)/i },
  { id: '스키마·마이그레이션', re: /(schema|migration|sql|table|column|\.v1\.json)/i },
]);
const UI_ASSERTION_DOMAINS = Object.freeze([
  { id: '문구·카피', re: /(copy|문구|카피|라벨|label|text|title|heading|toast|emoji|이모지|jargon|용어|plain[- ]?ko|한글|톤|tone|말투)/i },
  { id: 'CSS·스타일', re: /(css|style|class(name)?|tailwind|token|color|font|폰트|px|rem|spacing|shadow|lux|spark|toss|theme|dark)/i },
  { id: 'DOM·data 속성', re: /(data-[a-z]|aria-|role=|<[a-z]+|selector|dom|element|section|node|testid)/i },
  { id: '버튼·CTA', re: /(button|버튼|cta|click|탭|tab|sheet|modal|dialog|link|href)/i },
  { id: '반응형·뷰포트', re: /(responsive|viewport|mobile|desktop|breakpoint|geometry|layout|grid|width|height|반응형)/i },
  { id: 'PWA·서비스워커', re: /(pwa|service[- ]?worker|sw\.js|manifest\.webmanifest|install|offline|standalone|native[- ]?shell)/i },
  { id: '이미지·에셋', re: /(image|img|png|svg|icon|asset|thumbnail|logo|brand|badge)/i },
  { id: '접근성', re: /(a11y|axe|accessib|접근성|contrast|focus|screen[- ]?reader)/i },
  { id: '브라우저 화면·Playwright', re: /(playwright|page\.|chromium|webkit|firefox|screenshot|lighthouse|browser|e2e|spec\.cjs)/i },
  { id: '고객 route', re: /(apps\/web|\/wallet|\/profits|\/trades|\/me\b|\/auth\/|\/onboarding|route|page\.tsx|layout\.tsx|\.tsx)/i },
  { id: '어드민 화면', re: /(apps\/admin|\/admin\/|admin page|admin routes|어드민 화면|spark-admin)/i },
  { id: 'SDK 클라이언트', re: /(packages\/sdk|@aipo\/sdk|use[A-Z]\w+|hook|fetch\.ts|react)/i },
]);

// ───────────────────────────────────────────────────────────────────────────────
// 1. 유틸
// ───────────────────────────────────────────────────────────────────────────────
function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
    ...opts,
  });
}
function posix(p) {
  return String(p).replace(/\\/g, "/");
}
function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function uniq(arr) {
  return [...new Set(arr)];
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function globToRe(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
        if (glob[i + 1] === "/") i++;
      } else re += "[^/]*";
    } else if (c === "{") {
      const end = glob.indexOf("}", i);
      if (end < 0) {
        re += "\\{";
        continue;
      }
      const alts = glob.slice(i + 1, end).split(",").map(escRe);
      re += "(?:" + alts.join("|") + ")";
      i = end;
    } else re += escRe(c);
  }
  return new RegExp("^" + re + "$");
}

const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf", ".otf", ".pdf", ".zip", ".wasm", ".patch",
]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);

const TOP_DIRS = "(?:apps|packages|services|workers|tooling|governance|schemas|supabase|infra|docs|eval|scripts|CONSTITUTION|quality|assets|\\.cursor|\\.github|\\.husky|\\.vscode)";
const PATH_CHARS = "[A-Za-z0-9_.\\-\\/\\[\\]@{}*$]+";
const QUOTED_PATH_RE = new RegExp("[\"'`](" + TOP_DIRS + "\\/" + PATH_CHARS + ")[\"'`]", "g");
const BARE_PATH_RE = new RegExp("(?<![A-Za-z0-9_./\\-])(" + TOP_DIRS + "\\/" + PATH_CHARS + ")", "g");
const ROOT_FILE_LITERALS = [
  "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "AGENTS.md", "TOOLCHAIN.md", ".npmrc", ".nvmrc", ".node-version",
  "rust-toolchain.toml", "docker-compose.dev.yml", ".env.example", ".gitignore", ".cursorignore", ".markdownlint.json",
  ".markdownlintignore", ".markdownlint-cli2.jsonc", "PRE_IMPLEMENTATION_MASTER_AUDIT.md", "COMPANY_REGISTRATION_SUMMARY.md",
  "FOOTER_LICENSE_COPY.md",
];
const ROOT_FILE_RE = new RegExp("[\"'`](" + ROOT_FILE_LITERALS.map(escRe).join("|") + ")[\"'`]", "g");
const IMPORT_RES = [
  { kind: "import", re: /\bimport\s+(?:[^'"`;]*?\s+from\s+)?['"]([^'"]+)['"]/g },
  { kind: "import", re: /\bexport\s+[^'"`;]*?\s+from\s+['"]([^'"]+)['"]/g },
  { kind: "require", re: /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g },
  { kind: "dynamic-import", re: /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g },
];
const REQUIRE_JOIN_RE = /\brequire(?:\.resolve)?\(\s*(?:path\.)?(?:join|resolve)\(\s*(?:root|ROOT|__dirname|repoRoot|REPO_ROOT)\s*,\s*((?:['"][^'"]+['"]\s*,?\s*)+)\)/g;
const PATH_JOIN_RE = /\b(?:join|resolve)\(\s*(?:root|ROOT|repoRoot|REPO_ROOT)\s*,\s*((?:['"][^'"]+['"]\s*,?\s*){2,})\)/g;
const ENV_RE = /process\.env\.([A-Z][A-Z0-9_]+)/g;
const NODE_BUILTIN_RE = /^(fs|path|crypto|child_process|os|url|util|http|https|net|tls|zlib|stream|events|assert|buffer|readline|worker_threads|perf_hooks|dns|querystring|string_decoder|timers|tty|v8|vm|module|process|cluster|dgram|inspector|async_hooks|test)(\/|$)/;

// ───────────────────────────────────────────────────────────────────────────────
// 2. 인벤토리 · git 이력
// ───────────────────────────────────────────────────────────────────────────────
function loadInventory() {
  const files = git(["ls-files", "-z"]).split("\0").filter(Boolean).map(posix).sort();
  return { files, set: new Set(files) };
}

function loadDeletedPrefixes() {
  let deleted = [];
  try {
    let base = "origin/main";
    try {
      git(["rev-parse", "--verify", "--quiet", base]);
    } catch {
      base = null;
    }
    if (base) {
      deleted = git(["log", "--diff-filter=D", "--name-only", "--format=", base + "..HEAD"])
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(posix);
    }
  } catch {
    deleted = [];
  }
  const prefixes = new Set(DELETED_UI_PREFIXES_STATIC);
  const counts = {};
  for (const f of deleted) {
    const seg = f.split("/");
    // only UI app/package trees can become "deleted UI prefixes"; stage 4/5 verifier deletions under
    // tooling/verify/ (and any other backend tree) must not turn the surviving files there into UI paths
    if (seg.length >= 2 && (seg[0] === "apps" || seg[0] === "packages")) {
      const p = seg[0] + "/" + seg[1] + "/";
      counts[p] = (counts[p] || 0) + 1;
    }
  }
  for (const [p, n] of Object.entries(counts)) if (n >= 5) prefixes.add(p);
  return { prefixes: [...prefixes].sort(), deletedFiles: deleted, counts };
}

/** one `git log` walk instead of 1,900 `git log -1` spawns (low-spec machine) */
function loadLastCommitDates() {
  const out = git(["log", "--format=%x01%H %cI", "--name-only", "--no-renames"]);
  const map = new Map();
  let cur = null;
  for (const raw of out.split(/\r?\n/)) {
    if (!raw) continue;
    if (raw.charCodeAt(0) === 1) {
      const [sha, date] = raw.slice(1).split(" ");
      cur = { sha, date };
      continue;
    }
    const p = posix(raw.trim());
    if (cur && !map.has(p)) map.set(p, cur);
  }
  return map;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3. 참조 추출 (resolver · import · 경로 리터럴 · env)
// ───────────────────────────────────────────────────────────────────────────────
function makeResolver(inv, workspacePkgs) {
  const TRY_EXT = [".ts", ".tsx", ".js", ".cjs", ".mjs", ".json", ".d.ts"];
  function resolveRelative(fromFile, spec) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
    const cands = [base];
    for (const e of TRY_EXT) cands.push(base + e);
    for (const e of TRY_EXT) cands.push(base + "/index" + e);
    if (/\.js$/.test(base)) cands.push(base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx"));
    for (const c of cands) if (inv.set.has(c)) return c;
    return null;
  }
  function resolveWorkspace(spec) {
    for (const pkg of workspacePkgs) {
      if (spec === pkg.name || spec.startsWith(pkg.name + "/")) {
        const sub = spec === pkg.name ? "." : "./" + spec.slice(pkg.name.length + 1);
        const exp = pkg.exports && pkg.exports[sub];
        const target = typeof exp === "string" ? exp : pkg.main || null;
        if (target) {
          const rel = path.posix.normalize(path.posix.join(pkg.dir, target));
          if (inv.set.has(rel)) return { file: rel, pkg };
        }
        return { file: null, pkg };
      }
    }
    return null;
  }
  function expandLiteral(lit) {
    const l = lit.replace(/^\.\//, "").replace(/\/+$/, "");
    if (!l) return { targets: [], kind: "none" };
    if (/[*{]/.test(l)) {
      const re = globToRe(l);
      const targets = inv.files.filter((f) => re.test(f));
      if (targets.length) return { targets, kind: "glob" };
      const prefix = l.replace(/\/\*\*.*$/, "").replace(/\/\*.*$/, "");
      const under = inv.files.filter((f) => f.startsWith(prefix + "/"));
      return { targets: under, kind: under.length ? "glob" : "missing" };
    }
    if (inv.set.has(l)) return { targets: [l], kind: "file" };
    const under = inv.files.filter((f) => f.startsWith(l + "/"));
    if (under.length) return { targets: under, kind: "dir" };
    return { targets: [], kind: "missing" };
  }
  return { resolveRelative, resolveWorkspace, expandLiteral };
}

function extractRefs(file, text, ctx) {
  const ext = path.posix.extname(file);
  const refs = [];
  const envs = new Set();
  const isCode = CODE_EXT.has(ext);
  const deletedPrefixes = ctx.deletedPrefixes;
  const isDeleted = (lit) => deletedPrefixes.some((p) => lit === p.slice(0, -1) || lit.startsWith(p));
  const litKind = literalKindFor(file);

  function pushLiteral(lit, kind) {
    const cleaned = lit.replace(/[.,;:)\]]+$/, "");
    if (!cleaned || cleaned.length > 200) return;
    const { targets, kind: k } = ctx.resolver.expandLiteral(cleaned);
    refs.push({ kind, spec: cleaned, targets, resolvedAs: k, deleted: isDeleted(cleaned), absence: false });
  }

  if (isCode) {
    for (const { kind, re } of IMPORT_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const spec = m[1];
        if (spec.startsWith(".")) {
          const t = ctx.resolver.resolveRelative(file, spec);
          refs.push({ kind, spec, targets: t ? [t] : [], resolvedAs: t ? "file" : "missing", deleted: false, relative: true });
        } else if (spec.startsWith("@aipo/") || spec.startsWith("hiptk-")) {
          const r = ctx.resolver.resolveWorkspace(spec);
          refs.push({
            kind,
            spec,
            targets: r && r.file ? [r.file] : r && r.pkg ? [r.pkg.dir + "/package.json"] : [],
            resolvedAs: r ? "workspace" : "missing",
            deleted: r ? false : isDeleted(spec.replace("@aipo/", "packages/")),
            workspace: r ? r.pkg.name : spec,
          });
        } else if (!spec.startsWith("node:") && !NODE_BUILTIN_RE.test(spec)) {
          const external = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
          refs.push({ kind, spec, targets: [], resolvedAs: "external", external });
        }
      }
    }
    let mj;
    REQUIRE_JOIN_RE.lastIndex = 0;
    while ((mj = REQUIRE_JOIN_RE.exec(text))) {
      const parts = [...mj[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
      pushLiteral(path.posix.join(...parts), "require");
    }
    PATH_JOIN_RE.lastIndex = 0;
    while ((mj = PATH_JOIN_RE.exec(text))) {
      const parts = [...mj[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
      const joined = path.posix.join(...parts);
      if (new RegExp("^" + TOP_DIRS + "\\/").test(joined)) pushLiteral(joined, litKind);
    }
    ENV_RE.lastIndex = 0;
    let me;
    while ((me = ENV_RE.exec(text))) envs.add(me[1]);
  }

  const litRe = isCode ? QUOTED_PATH_RE : BARE_PATH_RE;
  litRe.lastIndex = 0;
  let m;
  const seen = new Set();
  while ((m = litRe.exec(text))) {
    const lit = m[1];
    if (seen.has(lit)) continue;
    seen.add(lit);
    pushLiteral(lit, litKind);
  }
  ROOT_FILE_RE.lastIndex = 0;
  while ((m = ROOT_FILE_RE.exec(text))) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    pushLiteral(m[1], litKind);
  }
  const lines = text.split(/\r?\n/);
  const absenceSpecs = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/existsSync/.test(line)) continue;
    const window = [line].concat(lines.slice(i + 1, i + 5)).join("\n");
    if (!/(must not (exist|contain)|handed off|FAIL: apps\/(web|admin)|fails\.push\(|must not contain apps\/)/.test(window)) {
      continue;
    }
    const pathRe = new RegExp("[\"'`](" + TOP_DIRS + "\\/" + PATH_CHARS + ")[\"'`]", "g");
    let pm;
    while ((pm = pathRe.exec(window))) absenceSpecs.add(pm[1]);
  }
  for (const r of refs) {
    if (r.deleted && absenceSpecs.has(r.spec)) r.absence = true;
  }
  return { refs, envs: [...envs] };
}

/** edge kind of a path literal depends on where the referring file lives */
function literalKindFor(file) {
  if (/^tooling\/verify\//.test(file) || /^scripts\//.test(file) || /^\.cursor\/hooks\//.test(file)) return "verifier-reads";
  if (/^tooling\/(e2e|engine-acceptance|pwa|ebay-resilience)\//.test(file) || /\.(spec|test|runtime\.test)\.(cjs|ts|mjs)$/.test(file)) return "test-ref";
  if (/^tooling\/(deploy|release|recovery|github|security|seed|schemas|cleanup|lowspec|dev|cursor)\//.test(file)) return "deploy-cmd";
  if (/^\.github\/workflows\//.test(file)) return "workflow-run";
  if (/wrangler.*\.toml$/.test(file)) return "wrangler-main";
  if (/docker-compose.*\.yml$/.test(file)) return "docker";
  if (/\.(md|mdc|txt)$/.test(file)) return "doc-link";
  if (/(^|\/)package\.json$/.test(file)) return "pkg-script";
  return "verifier-reads";
}

// ── workflow / package script / wrangler parsers ──────────────────────────────
function parseWorkflow(text) {
  const lines = text.split(/\r?\n/);
  const jobs = [];
  const paths = [];
  const uses = [];
  let inJobs = false;
  let job = null;
  let step = null;
  let inRun = false;
  let runIndent = 0;
  let inPaths = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();
    if (inRun) {
      if (trimmed === "" || indent > runIndent) {
        step.run += "\n" + trimmed;
        continue;
      }
      inRun = false;
    }
    if (/^paths(-ignore)?:\s*$/.test(trimmed)) {
      inPaths = true;
      continue;
    }
    if (inPaths) {
      const pm = trimmed.match(/^-\s*['"]?([^'"]+?)['"]?\s*$/);
      if (pm) {
        paths.push(pm[1]);
        continue;
      }
      inPaths = false;
    }
    if (indent === 0 && /^jobs:\s*$/.test(trimmed)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (indent === 2 && /^[A-Za-z0-9_-]+:\s*$/.test(trimmed)) {
      job = { id: trimmed.slice(0, -1), steps: [], needs: [], if: null, runsOn: null, timeout: null, strategy: false, workingDirectory: [] };
      jobs.push(job);
      step = null;
      continue;
    }
    if (!job) continue;
    if (indent === 4) {
      const kv = trimmed.match(/^([a-z-]+):\s*(.*)$/);
      if (kv) {
        if (kv[1] === "needs") job.needs = kv[2].replace(/[\[\]]/g, "").split(",").map((s) => s.trim()).filter(Boolean);
        if (kv[1] === "if") job.if = kv[2];
        if (kv[1] === "runs-on") job.runsOn = kv[2];
        if (kv[1] === "timeout-minutes") job.timeout = Number(kv[2]);
        if (kv[1] === "strategy") job.strategy = true;
      }
    }
    if (indent === 6 && /^-\s/.test(trimmed)) {
      step = { name: null, uses: null, run: null, workingDirectory: null };
      job.steps.push(step);
    }
    if (step && indent >= 6) {
      const body = trimmed.replace(/^-\s+/, "");
      const kv = body.match(/^([a-z-]+):\s*(.*)$/);
      if (kv) {
        if (kv[1] === "name") step.name = kv[2];
        if (kv[1] === "uses") {
          step.uses = kv[2];
          uses.push(kv[2]);
        }
        if (kv[1] === "working-directory") {
          step.workingDirectory = kv[2];
          job.workingDirectory.push(kv[2]);
        }
        if (kv[1] === "run") {
          if (/^[|>]-?\s*$/.test(kv[2])) {
            step.run = "";
            inRun = true;
            runIndent = indent;
          } else step.run = kv[2];
        }
      }
    }
  }
  const isEcho = (s) => s.run != null && !s.uses && /^\s*echo\b/.test(s.run.trim()) && !/\n\s*[^e\s]/.test(s.run.trim());
  for (const j of jobs) {
    j.noop = j.steps.length > 0 && j.steps.every(isEcho);
    j.noopSteps = j.steps.filter(isEcho).map((s) => s.name || "(unnamed)");
    j.runCount = j.steps.filter((s) => s.run != null).length;
  }
  return { jobs, paths, uses };
}

function workflowRunRefs(text, rootScripts) {
  const refs = [];
  const pnpmRe = /\bpnpm\s+(?:--filter\s+(\S+)\s+)?([a-zA-Z][\w:.-]*)/g;
  const nodeRe = /\bnode\s+((?:tooling|scripts|services|workers|packages)\/[^\s"']+)/g;
  let m;
  while ((m = pnpmRe.exec(text))) {
    if (m[1]) refs.push({ kind: "workflow-run", spec: "pnpm --filter " + m[1] + " " + m[2], filter: m[1], script: m[2] });
    else if (rootScripts[m[2]]) refs.push({ kind: "workflow-run", spec: "pnpm " + m[2], script: m[2] });
  }
  while ((m = nodeRe.exec(text))) refs.push({ kind: "workflow-run", spec: "node " + m[1], file: m[1] });
  return refs;
}

function parseScriptTargets(cmd) {
  const out = [];
  let m;
  const nodeRe = /\bnode\s+((?:tooling|scripts|services|workers|packages)\/[^\s"'&|]+)/g;
  while ((m = nodeRe.exec(cmd))) out.push({ kind: "pkg-script", file: m[1] });
  const psRe = /-File\s+((?:tooling|scripts)\/[^\s"'&|]+)/g;
  while ((m = psRe.exec(cmd))) out.push({ kind: "pkg-script", file: m[1] });
  const composeRe = /docker\s+compose\s+-f\s+(\S+)/g;
  while ((m = composeRe.exec(cmd))) out.push({ kind: "docker", file: m[1] });
  const execRe = /\bpnpm\s+exec\s+([a-zA-Z@][\w./-]*)/g;
  while ((m = execRe.exec(cmd))) out.push({ kind: "pkg-dep", bin: m[1] });
  const chainRe = /\bpnpm\s+(?:run\s+)?([a-zA-Z][\w:.-]*)/g;
  while ((m = chainRe.exec(cmd))) if (m[1] !== "exec" && m[1] !== "--filter") out.push({ kind: "pkg-script", script: m[1] });
  return out;
}

function parseWrangler(text) {
  const out = { name: null, main: null, routes: [], envs: [], assetsDir: null };
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sec = line.match(/^\[\[?([^\]]+)\]\]?$/);
    if (sec) {
      cur = sec[1];
      const env = cur.match(/^env\.([A-Za-z0-9_-]+)/);
      if (env && !out.envs.includes(env[1])) out.envs.push(env[1]);
      continue;
    }
    const kv = line.match(/^([A-Za-z_]+)\s*=\s*"([^"]*)"/);
    if (!kv) continue;
    if (kv[1] === "name" && !cur) out.name = kv[2];
    if (kv[1] === "main") out.main = kv[2];
    if (kv[1] === "pattern") out.routes.push(kv[2]);
    if (kv[1] === "directory") out.assetsDir = kv[2];
  }
  return out;
}

function setClass(rec, cls, decision, stage, reason) {
  rec.class = cls;
  rec.decision = decision;
  rec.stage = stage;
  rec.reasons.push(reason);
}

function safeRequire(p) {
  try {
    return require(p);
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// 4. 시드 규칙 (경로 → class/decision) — 순서대로 첫 매치 · 데이터로 노출
// ───────────────────────────────────────────────────────────────────────────────
function seedRules() {
  const rules = [];
  const add = (id, test, cls, decision, stage, reason) => rules.push({ id, test, cls, decision, stage, reason });
  const re = (r) => (f) => r.test(f);
  const S = STAGE;

  // services (runtime · test)
  add('api-nest-test', re(/^services\/api-nest\/.*\.(runtime\.test|test|spec)\.(ts|cjs|mjs|js)$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'Nest 런타임/단위 테스트 (tsconfig exclude · CI 실행)');
  add('api-nest', re(/^services\/api-nest\//), 'BACKEND_RUNTIME', 'KEEP', S.NONE, 'Nest API 런타임 (tsconfig include src/**)');
  add('engine-rust-test', re(/^services\/engine-rust\/(testdata|tests)\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'Rust Rule Engine 골든 테스트 데이터 (gate.yml cargo test)');
  add('engine-rust', re(/^services\/engine-rust\//), 'BACKEND_RUNTIME', 'KEEP', S.NONE, 'Rust Rule Engine crate (gate.yml cargo check/test · settlement_rule.cjs 미러)');
  add('svc-test', re(/^services\/[^/]+\/.*\.(test|spec|runtime\.test)\.(cjs|mjs|js|ts)$/), 'BACKEND_TEST', 'KEEP', S.NONE, '서비스 패키지 테스트');
  add('svc-runtime', re(/^services\/(ai-platform|feature-platform|market-intelligence|memory-service|shadow-replay-engine|simulation-engine|user-twin-service)\//), 'BACKEND_RUNTIME', 'KEEP', S.NONE, 'api-nest package.json workspace 의존 (@aipo/*)');
  add('svc-marketing-attribution', re(/^services\/marketing-attribution\//), 'BACKEND_RUNTIME', 'KEEP', S.PACKAGE_CLEANUP, '백엔드 스켈레톤(UTM/ROAS/CAPI) · workers/marketing-capi-dispatcher가 M1+ 연동 대상으로 명시 · UI 0 · 런타임 import 0 → 8단계에서 유지/축소 재확인 (기본 KEEP)');

  // DB · contract · shared packages
  add('supabase', re(/^supabase\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'Supabase migration/config (ADR-001 · apply는 별도 절차)');
  add('packages-observability', re(/^packages\/observability\//), 'BACKEND_RUNTIME', 'KEEP', S.NONE, 'api-nest obs.exception-filter.ts가 런타임 require');
  add('packages-schemas', re(/^packages\/schemas\//), 'OBSOLETE', 'DELETE', S.PACKAGE_CLEANUP, 'repo-root /schemas 경로 헬퍼 패키지 · 런타임/테스트 소비자 0 (stack-lock mustExist만) → 미사용 패키지');
  add('packages-sdk', re(/^packages\/sdk\//), 'CUSTOMER_WEB', 'MOVE', S.PACKAGE_CLEANUP, 'React 고객 웹 HTTP 클라이언트(peerDependency react) · services/workers import 0 · putduk-web 인계');

  // workers · infra
  add('worker-web-proxy', re(/^workers\/web-proxy\//), 'CUSTOMER_WEB', 'MOVE', S.CLOUDFLARE_RESIDUE, 'app/apex/go → OpenNext 고객 웹 origin 프록시 (원격 라우팅은 putduk-web 소유로 인계)');
  add('worker-ops-proxy', re(/^workers\/ops-proxy\//), 'LEGACY_ADMIN_UI', 'DELETE', S.CLOUDFLARE_RESIDUE, 'ops.hiptk.app → 레거시 어드민 OpenNext origin 프록시');
  add('shared-opennext-origin', re(/^workers\/_shared\/opennext-origin\.ts$/), 'CUSTOMER_WEB', 'MOVE', S.CLOUDFLARE_RESIDUE, 'OpenNext web/ops origin SSOT 미러 (web-proxy/ops-proxy 전용)');
  add('shared-api-origin', re(/^workers\/_shared\/api-origin\.ts$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'Nest API origin SSOT (api-stub)');
  add('workers-runtime', re(/^workers\/[^/]+\/src\//), 'BACKEND_RUNTIME', 'KEEP', S.NONE, 'Cloudflare Worker 런타임 (wrangler main)');
  add('workers-config', re(/^workers\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'Worker 설정/패키지 (wrangler.toml · package.json · tsconfig)');
  add('infra-web', re(/^infra\/web\//), 'CUSTOMER_WEB', 'DELETE', S.CLOUDFLARE_RESIDUE, 'OpenNext 고객 웹 wrangler (main=apps/web/.open-next — 소스 삭제됨)');
  add('infra-ops-access', re(/^infra\/ops\/access-policy\.json$/), 'FUTURE_ADMIN_REQUIREMENT', 'MOVE', S.CLOUDFLARE_RESIDUE, 'ops host CF Access 정책 템플릿 → quality/admin-handoff에 요약 후 제거');
  add('infra-ops', re(/^infra\/ops\//), 'LEGACY_ADMIN_UI', 'DELETE', S.CLOUDFLARE_RESIDUE, '레거시 어드민 OpenNext wrangler (main=apps/admin/.open-next — 소스 삭제됨)');
  add('infra-domain-manifest', (f) => f === 'infra/domain.manifest.json', 'BACKEND_INFRA', 'KEEP', S.NONE, 'hiptk.app DNS + api-stub + forbiddenDeploy + productionHosts');
  add('infra-hosts-manifest', (f) => f === 'infra/hosts.manifest.json', 'BACKEND_INFRA', 'KEEP', S.NONE, 'Phase0 bus/DB/R2/API hosts');
  add('infra', re(/^infra\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'API/R2/workers 인프라 매니페스트');
  add('schemas', re(/^schemas\/[^/]+\.json$/), 'BACKEND_CONTRACT', 'KEEP', S.NONE, 'JSON 계약 SSOT (소비자 그래프로 재판정)');

  // .github
  add('wf-release-build', re(/^\.github\/workflows\/release-build\.yml$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'api-nest artifact + workers prebuild only (web/admin build:cf removed in the CI replacement stage)');
  add('wf-release-integration', re(/^\.github\/workflows\/release-integration-contract\.yml$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'release-contract-static job only (strict-webkit no-op job removed in the CI replacement stage)');
  add('wf-deploy-cf', re(/^\.github\/workflows\/deploy-cloudflare\.yml$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'workers deploy only (surface=web|ops steps removed in the CI replacement stage)');
  add('workflows', re(/^\.github\/workflows\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '백엔드 CI/배포 workflow');
  add('github-misc', re(/^\.github\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'GitHub 설정');

  // tooling/verify — 세부는 evidence 단계에서 재판정
  add('verify-gate-core', re(/^tooling\/verify\/(gate|gate-fast|gate-push|gate-runner|gate-tiers|only-pnpm|secrets|plans-ssot|workflow-action-pin|domain-by-path-ci|domain-by-path\.selftest|night-guard|project-boundary|api-nest-build|pg-module-scan|bucket-invariant)\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, '3-tier gate 코어 · 보안 게이트');
  add('verify-domain-by-path', re(/^tooling\/verify\/domain-by-path\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'T0 path-to-verifier map · handed-off customer-web prefixes are skipped so deleted trees do not select removed UI checkers');
  add('verify-stack-lock', re(/^tooling\/verify\/stack-lock\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'T0 backend stack lock (Nest · Rust · Cloudflare Workers · no UI packages)');
  add('verify-backend-runner', re(/^tooling\/verify\/backend\/run-all\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'T1 backend 러너 · mixed 검증기 백엔드 포트(tooling/verify/backend/**) 전부 순차 실행 · skip 0');
  add('verify-backend-port', re(/^tooling\/verify\/backend\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'mixed 검증기 백엔드 어서션 포트 (원본 SHA 86f15964 · UI 어서션은 quality/putduk-web-ui-assertions-handoff.md) · evidence 재판정 대상');
  add('verify-stubs-runner', re(/^tooling\/verify\/stubs\/run-all\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'T1 domain stub runner · live list is backend checkers only');
  add('verify-lib-ui-capture', re(/^tooling\/verify\/lib\/(capture-admin-visual|capture-visual-reconciliation|platform-redesign-measure|run-account-spec)\.cjs$/), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, '브라우저 캡처/시각 측정 라이브러리');
  add('verify-catalog', re(/^tooling\/verify\/CATALOG\.md$/), 'MIXED', 'SPLIT', S.MARKDOWN_CLEANUP, '검증기 카탈로그 · UI 행 제거 (stack-lock mustExist)');
  add('verify-responsive', re(/^tooling\/verify\/responsive\//), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'Canon 뷰포트 Playwright 시각 회귀 하네스 (브라우저)');
  add('verify-rc-formal', re(/^tooling\/verify\/rc-formal\.cjs$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'RC_FORMAL lock verifier · evidence-only allowlist includes remaining HTTP harness under tooling/e2e');
  add('legacy-plan-verify', re(/^tooling\/verify\/legacy-plan-migration\.cjs$/), 'OBSOLETE', 'DELETE', S.MARKDOWN_CLEANUP, 'REL-017 레거시 플랜 레지스트리(21파일 · executionAuthority=NO 스탬프) 검증기 — 플랜·레지스트리·스탬프와 함께 제거 (domain-by-path 매핑도 함께 삭제)');
  add('verify-fixture', re(/^tooling\/verify\/fixtures\//), 'BACKEND_TEST', 'KEEP', S.NONE, '검증기 픽스처 (소비 검증기 class 상속)');
  add('verify', re(/^tooling\/verify\//), 'BACKEND_TEST', 'KEEP', S.NONE, '검증기 (evidence 재판정)');

  // tooling/e2e · engine-acceptance · pwa · perf · scaffold · deploy · release · recovery · misc
  add('e2e-harness-spec', re(/^tooling\/e2e\/specs\/(auth-rate-limit|ledger-user-query|money-red-team)\.spec\.cjs$/), 'BACKEND_TEST', 'KEEP', S.PACKAGE_CLEANUP, '브라우저 0 · HTTP/in-process 하네스 · @playwright/test는 러너로만 사용 → 8단계에서 node:test 러너로 교체');
  add('e2e-money-unavailable', re(/^tooling\/e2e\/(specs\/money-unavailable\.spec\.cjs|lib\/money-unavailable\.cjs)$/), 'CUSTOMER_WEB', 'MOVE', S.UI_TEST_REMOVAL, 'moneyDisplayState = 화면 표시 상태 규칙(UNAVAILABLE vs 0) · 백엔드 소비자 0 · putduk-web 인계');
  add('e2e-auth-session', re(/^tooling\/e2e\/helpers\/auth-session(\.runtime\.test)?\.cjs$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'in-process QA isolation session helper + node:test (no browser)');
  add('e2e-qa-lab', re(/^tooling\/e2e\/(specs\/qa-lab-expansion\.spec\.cjs|lib\/qa-lab-expansion\.cjs|expansion\/|specs\/happy-path\.placeholder\.spec\.cjs|persona\/)/), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'REL-500 QA Lab matrix bound to deleted browser closure specs');
  add('e2e-browser-spec', re(/^tooling\/e2e\/specs\/.*\.spec\.cjs$/), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'Playwright page.* 브라우저 E2E (고객 웹/어드민 화면)');
  add('e2e-lib-backend', re(/^tooling\/e2e\/lib\/(auth-rate-limit-harness|ledger-user-query-harness|money-mutation-gate|money-red-team|qa-env-isolation-guard)\.cjs$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'HTTP/in-process 하네스 (브라우저 0)');
  add('e2e-fixture-qa', re(/^tooling\/e2e\/fixtures\/qa-allowlist\.v1\.json$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'QA 격리 allowlist (qa-env-isolation-guard · release-integration-contract paths)');
  add('e2e-money-docs', re(/^tooling\/e2e\/money\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'REL-501 money red-team 매트릭스/보고 (in-process · 소비자 그래프로 재판정)');
  add('e2e-readme', re(/^tooling\/e2e\/README\.md$/), 'MIXED', 'SPLIT', S.MARKDOWN_CLEANUP, 'E2E 안내 문서 · 브라우저 스펙 절 제거 후 하네스 안내만 유지');
  add('e2e', re(/^tooling\/e2e\//), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, '브라우저 E2E 잔재');
  add('engine-acceptance', re(/^tooling\/engine-acceptance\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'Engine Acceptance QA 하네스 (engine-acceptance*.yml)');
  add('ebay-resilience', re(/^tooling\/ebay-resilience\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'eBay fault-injection (ebay-fault-injection.yml)');
  add('pwa-vapid', re(/^tooling\/pwa\/generate-vapid\.mjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'Web Push VAPID 키 생성 (서버 발송 측)');
  add('pwa-webauthn-rp', re(/^tooling\/pwa\/webauthn-rp\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'WebAuthn RP id/origin loader (domain.manifest · Nest RP SSOT)');
  add('pwa-webauthn-ux', re(/^tooling\/pwa\/webauthn-ux(-harness\.cjs|\.spec\.cjs)$/), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'WebAuthn 브라우저 지원 감지·햅틱 UX 케이스 (화면 측)');
  add('pwa-day1-cert', re(/^tooling\/pwa\/pwa-day1-certification(-harness\.cjs|\.spec\.cjs)$/), 'BACKEND_TEST', 'KEEP', S.NONE, 'push-dispatcher kill-switch + VAPID/RP contract files; customer-web install/offline items handed off');
  add('pwa-lighthouse', re(/^tooling\/pwa\/lighthouse-pwa\.ci\.cjs$/), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'PWA Lighthouse 정적 예산 (UI 성능)');
  add('pwa', re(/^tooling\/pwa\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'push-dispatcher dispatch/channel-filter 하네스 (workers/push-dispatcher/src/lib 소비 · 브라우저 0)');
  add('perf', re(/^tooling\/perf\//), 'OBSOLETE', 'DELETE', S.UI_TEST_REMOVAL, 'Lighthouse 정적 예산 (UI 성능)');
  add('scaffold', re(/^tooling\/scaffold\//), 'OBSOLETE', 'DELETE', S.PACKAGE_CLEANUP, 'apps/web·packages/ui 등 모노레포 스켈레톤 생성기 (삭제된 트리 재생성 코드)');
  add('deploy-pages', re(/^tooling\/deploy\/cf-(pages-web|pages-ops|deploy-staging|rollback-staging)\.cjs$/), 'OBSOLETE', 'DELETE', S.CLOUDFLARE_RESIDUE, 'OpenNext web/ops Workers 배포·롤백 (apps/* 산출물 필요)');
  add('deploy-backend', re(/^tooling\/deploy\/cf-(preflight|domain-bridge|origin-smoke)\.cjs$/), 'BACKEND_INFRA', 'KEEP', S.NONE, 'api-stub/workers preflight · remote origin liveness (mutation 0)');
  add('deploy', re(/^tooling\/deploy\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'Workers/API 배포 도구');
  add('release', re(/^tooling\/release\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '릴리스 아티팩트/수락 도구 (evidence 재판정)');
  add('recovery', re(/^tooling\/recovery\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '복구/증거 재구축 도구');
  add('github-tools', re(/^tooling\/github\//), 'BACKEND_INFRA', 'KEEP', S.CI_REPLACE, 'main 룰셋 JSON + 적용 스크립트 (required context 이름 변경 시 함께 갱신)');
  add('security', re(/^tooling\/security\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '의존성 감사 · 보안 헤더');
  add('seed', re(/^tooling\/seed\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '카탈로그 런타임 시드');
  add('schemas-tools', re(/^tooling\/schemas\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '스키마/법무 문서 생성기 (evidence 재판정)');
  add('dev-tools', re(/^tooling\/(cleanup|lowspec|dev|cursor)\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '로컬 개발/저사양 운영 도구');
  add('legacy-plan-stamp', re(/^tooling\/legacy-plan-stamp\.cjs$/), 'OBSOLETE', 'DELETE', S.MARKDOWN_CLEANUP, 'REL-017 레거시 플랜 권위 스탬프 — 플랜 정리와 함께 제거');  add('tooling-backend', re(/^tooling\/backend\//), 'BACKEND_INFRA', 'KEEP', S.NONE, '백엔드 전용 경계 도구 (이 생성기)');

  // root · config · misc
  add('root-package', (f) => f === 'package.json', 'BACKEND_INFRA', 'KEEP', S.NONE, 'root scripts/devDependencies are backend toolchain (Nest · wrangler · husky · typescript)');
  add('root-workspace', (f) => f === 'pnpm-workspace.yaml', 'BACKEND_INFRA', 'KEEP', S.NONE, 'pnpm workspace (packages/* services/* workers/* tooling/*)');
  add('root-lock', (f) => f === 'pnpm-lock.yaml', 'GENERATED', 'KEEP', S.PACKAGE_CLEANUP, 'lockfile · 패키지 정리 후 재생성');
  add('root-docker', (f) => f === 'docker-compose.dev.yml', 'BACKEND_INFRA', 'KEEP', S.NONE, '로컬 Postgres/Redis 옵션 (Phase0 기본 OFF)');
  add('root-envexample', (f) => f === '.env.example', 'BACKEND_INFRA', 'KEEP', S.NONE, '환경변수 예시 (evidence 재판정)');
  add('root-toolchain-files', (f) => ['.npmrc', '.nvmrc', '.node-version', 'rust-toolchain.toml', '.gitignore', '.cursorignore', '.markdownlint.json', '.markdownlintignore', '.markdownlint-cli2.jsonc'].includes(f), 'BACKEND_INFRA', 'KEEP', S.NONE, '툴체인/무시 설정');
  add('husky', re(/^\.husky\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'git hooks (T0/T1)');
  add('vscode', re(/^\.vscode\//), 'BACKEND_INFRA', 'KEEP', S.NONE, 'IDE 설정');
  add('cursor-hooks', re(/^\.cursor\/(hooks\/|hooks\.json$|mcp\.json$|permissions\.json$)/), 'BACKEND_INFRA', 'KEEP', S.NONE, '에이전트 경계 훅/MCP (stack-lock mustExist)');
  add('scripts', re(/^scripts\//), 'BACKEND_TEST', 'KEEP', S.NONE, '훅 경계/안정성 검증 스크립트');
  add('eval', re(/^eval\//), 'BACKEND_TEST', 'KEEP', S.NONE, 'AI 가드 eval 데이터셋 (verify:ai-*)');
  add('assets-gitkeep', (f) => f === 'assets/.gitkeep', 'OBSOLETE', 'DELETE', S.MARKDOWN_CLEANUP, '빈 디렉터리 placeholder · 참조 0');
  add('quality-generated', (f) => f === OUT_OWNERSHIP || f === OUT_GRAPH || ANALYSIS_ARTIFACT_RE.test(f), 'GENERATED', 'KEEP', S.NONE, 'ownership-graph.cjs 산출물 (재생성 가능 · 참조 추출 대상에서 제외)');
  add('quality-admin-handoff', re(/^quality\/admin-handoff\//), 'FUTURE_ADMIN_REQUIREMENT', 'KEEP', S.NONE, '미래 어드민 인계 요약');
  add('quality', re(/^quality\//), 'BACKEND_DOC', 'KEEP', S.NONE, '백엔드 전용 전환 문서');
  add('docs-kyb', re(/^docs\/kyb\//), 'BACKEND_DOC', 'KEEP', S.NONE, '법인/사업자 증빙 (법률 문서 · 편집 금지)');
  add('docs', re(/^docs\//), 'BACKEND_DOC', 'KEEP', S.NONE, '운영/부트스트랩 문서');

  // governance · rules · plans · CONSTITUTION · root MD → evidence/overrides 단계에서 확정
  add('gov-brand', (f) => f === 'governance/brand/brand.manifest.json', 'BACKEND_CONTRACT', 'KEEP', S.NONE, 'T0 brand-consumer.cjs가 읽는 브랜드 이름 SSOT');
  add('gov-backend-dir', (f) => GOVERNANCE_BACKEND_DIRS.some((d) => f.startsWith(d)), 'BACKEND_DOC', 'KEEP', S.NONE, '백엔드 release evidence 디렉터리');
  add('gov-ui-dir', (f) => GOVERNANCE_UI_DIRS.some((d) => f.startsWith(d)), 'OBSOLETE', 'DELETE', S.GOVERNANCE_EVIDENCE, 'UI 화면 증거 디렉터리 (KEEP 검증기 참조 시 뒤집힘)');
  add('gov-rm-png', re(/^governance\/release-master\/.*\.png$/), 'OBSOLETE', 'DELETE', S.GOVERNANCE_EVIDENCE, '고객/어드민 화면 스크린샷 증거');
  add('gov-rm-ui', (f) => RELEASE_MASTER_UI_TITLE.test(f), 'OBSOLETE', 'DELETE', S.GOVERNANCE_EVIDENCE, '고객 화면(REL-1xx)·어드민 화면(REL-20x)·웹 lint/axe/pwa/device/webauthn-ux·lighthouse·age-cohort 증거');
  add('gov-rm-backend', (f) => RELEASE_MASTER_BACKEND_TITLE.test(f), 'BACKEND_DOC', 'KEEP', S.NONE, '백엔드 release evidence (원장·보안·RBAC·kill-switch·마이그레이션·staging·rollback)');
  add('gov-legacy-plan', re(/^governance\/legacy-plan-migration\//), 'OBSOLETE', 'DELETE', S.MARKDOWN_CLEANUP, 'REL-017 레거시 플랜 레지스트리 — 플랜 정리와 함께 제거');
  add('gov-rest', re(/^governance\//), 'UNKNOWN', 'KEEP', S.GOVERNANCE_EVIDENCE, '시드 없음 → evidence/overrides');
  add('cursor-rules', re(/^\.cursor\/rules\//), 'UNKNOWN', 'KEEP', S.MARKDOWN_CLEANUP, '내용 기준 overrides');
  add('cursor-plans', re(/^\.cursor\/plans\//), 'UNKNOWN', 'KEEP', S.MARKDOWN_CLEANUP, '내용 기준 overrides (sync-plans-ssot 제약 포함)');
  add('constitution', re(/^CONSTITUTION\//), 'UNKNOWN', 'KEEP', S.MARKDOWN_CLEANUP, '내용 기준 overrides');
  add('root-md', re(/^[^/]+\.md$/), 'UNKNOWN', 'KEEP', S.MARKDOWN_CLEANUP, '내용 기준 overrides');
  return rules;
}

// ───────────────────────────────────────────────────────────────────────────────
// 5. mixedBreakdown — 파일 내용을 읽어 백엔드/UI 어서션을 도메인별로 요약
// ───────────────────────────────────────────────────────────────────────────────
const UI_HINT_RE = /(문구|카피|copy|css|class|data-|button|버튼|viewport|responsive|pwa|sw\.js|axe|playwright|page\.|screenshot|apps\/web|apps\/admin|packages\/ui|packages\/sdk|\.tsx)/i;

function classifyAssertionDomain(textForDomain, sourcePath, uiPathTest, bePathTest) {
  // domain: message text first, then the source path as a fallback (path words like "settlement_rule" must not outrank the message)
  const pick = (dict, fallback) => dict.find((x) => x.re.test(textForDomain)) || (sourcePath && dict.find((x) => x.re.test(sourcePath))) || { id: fallback };
  if (sourcePath && uiPathTest(sourcePath)) return { side: "ui", domain: pick(UI_ASSERTION_DOMAINS, '기타 UI').id };
  if (sourcePath && bePathTest(sourcePath)) return { side: "backend", domain: pick(BACKEND_ASSERTION_DOMAINS, '기타 백엔드').id };
  const uiHit = UI_ASSERTION_DOMAINS.find((x) => x.re.test(textForDomain));
  const beHit = BACKEND_ASSERTION_DOMAINS.find((x) => x.re.test(textForDomain));
  if (uiHit && (!beHit || UI_HINT_RE.test(textForDomain))) return { side: "ui", domain: uiHit.id };
  if (beHit) return { side: "backend", domain: beHit.id };
  if (uiHit) return { side: "ui", domain: uiHit.id };
  return { side: "unknown", domain: '미분류' };
}

function buildMixedBreakdown(text, uiPathTest, bePathTest, deletedPrefixes) {
  const lines = text.split(/\r?\n/);
  const backend = [];
  const ui = [];
  const unknownAsserts = [];
  const uiPaths = new Set();
  const backendPaths = new Set();
  let currentSource = null;
  let pendingNeedles = [];
  let collectingNeedles = false;
  const pathRe = new RegExp("[\"'`](" + TOP_DIRS + "\\/" + PATH_CHARS + ")[\"'`]", "g");
  const isDeleted = (p) => deletedPrefixes.some((d) => p.startsWith(d));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    pathRe.lastIndex = 0;
    let pm;
    while ((pm = pathRe.exec(line))) {
      const p = pm[1];
      if (/^tooling\/verify\//.test(p)) continue;
      currentSource = p;
      if (isDeleted(p) || uiPathTest(p)) uiPaths.add(p);
      else if (bePathTest(p)) backendPaths.add(p);
    }
    if (/for\s*\(\s*const\s+\w+\s+of\s*\[/.test(line)) {
      collectingNeedles = true;
      pendingNeedles = [];
    }
    if (collectingNeedles) {
      for (const nm of line.matchAll(/["'`]([^"'`]{2,120})["'`]/g)) {
        if (!new RegExp("^" + TOP_DIRS + "\\/").test(nm[1])) pendingNeedles.push(nm[1]);
      }
      if (/\]\s*\)/.test(line)) collectingNeedles = false;
    }
    if (!/\b(fails?\.push|fail\(|expect\(|assert(?:\.\w+)?\(|throw new Error\()/.test(line)) continue;
    const msgs = [...line.matchAll(/["'`]([^"'`]{3,200})["'`]/g)].map((x) => x[1]);
    const windowText = lines.slice(Math.max(0, i - 4), i + 1).join(" ");
    let msg = msgs.length ? msgs.join(" · ") : line.trim().slice(0, 160);
    if (pendingNeedles.length && /needle|\$\{/.test(line)) msg += " <= needles: " + pendingNeedles.slice(0, 12).join(" | ");
    const { side, domain } = classifyAssertionDomain(msg + " " + windowText, currentSource, uiPathTest, bePathTest);
    const entry = { domain, source: currentSource, line: i + 1, detail: msg.slice(0, 240) };
    if (side === "backend") backend.push(entry);
    else if (side === "ui") ui.push(entry);
    else unknownAsserts.push(entry);
  }
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter((e) => {
      const k = e.domain + "|" + e.detail;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  return {
    backendAssertions: dedupe(backend),
    uiAssertions: dedupe(ui),
    unclassifiedAssertions: dedupe(unknownAsserts),
    backendPaths: [...backendPaths].sort(),
    uiPaths: [...uiPaths].sort(),
    backendDomains: uniq(backend.map((b) => b.domain)),
    uiDomains: uniq(ui.map((u) => u.domain)),
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// 6. 문서 키워드 점수 (rules/plans/CONSTITUTION/루트 MD · governance 잔여 보조 근거)
// ───────────────────────────────────────────────────────────────────────────────
const DOC_UI_KEYWORDS = /(화면|컴포넌트|component|css|tailwind|뷰포트|viewport|반응형|responsive|목업|mockup|figma|픽셀|pixel|폰트|font|버튼|button|toast|토스트|pwa|service ?worker|manifest\.webmanifest|lux|spark|toss premium|애니메이션|motion|접근성|axe|lighthouse|스크린샷|screenshot|storybook|next\.js|next@|react|tsx|apps\/web|apps\/admin|packages\/ui|canon|visual|geometry|hero|bottom nav|sidebar|typography|이모지|emoji)/gi;
const DOC_BACKEND_KEYWORDS = /(원장|ledger|정산|settlement|마이그레이션|migration|\bsql\b|테이블|table|rls|jwt|세션|session|쿠키|cookie|oauth|kyc|출금|입금|withdraw|deposit|idempoten|수수료|\bfee\b|rbac|감사|audit|kill.?switch|nest|controller|endpoint|엔드포인트|\/api\/v1|rust|engine|매칭|policy|정책|redis|postgres|supabase|\br2\b|worker|cron|render|rollback|롤백|recovery|복구|보안|security|cve|dependency audit|staging|스테이징|schema|스키마|adapter|어댑터|webhook|ingest|잔액|balance|bucket|버킷)/gi;
function docKeywordScore(text) {
  const ui = (text.match(DOC_UI_KEYWORDS) || []).length;
  const be = (text.match(DOC_BACKEND_KEYWORDS) || []).length;
  return { ui, backend: be, ratio: be + ui ? Math.round((ui / (be + ui)) * 100) / 100 : null };
}

// ───────────────────────────────────────────────────────────────────────────────
// 7. 메인
// ───────────────────────────────────────────────────────────────────────────────
function build() {
  const inv = loadInventory();
  const headSha = git(["rev-parse", "HEAD"]).trim();
  const deleted = loadDeletedPrefixes();
  const lastCommit = loadLastCommitDates();

  // 7.1 workspace package map
  const workspacePkgs = [];
  const pkgJsonByPath = new Map();
  for (const f of inv.files) {
    if (!/(^|\/)package\.json$/.test(f)) continue;
    try {
      const j = JSON.parse(readText(f));
      pkgJsonByPath.set(f, j);
      if (j.name && f !== "package.json") workspacePkgs.push({ name: j.name, dir: path.posix.dirname(f), exports: j.exports || null, main: j.main || null, json: j });
    } catch {
      /* ignore invalid package.json */
    }
  }
  const rootPkg = pkgJsonByPath.get("package.json") || { scripts: {}, devDependencies: {} };
  const rootScripts = rootPkg.scripts || {};
  const resolver = makeResolver(inv, workspacePkgs);
  const uiPathTest = (p) =>
    deleted.prefixes.some((d) => p.startsWith(d)) ||
    UI_PATH_RULES.some((r) => r.re.test(p)) ||
    GOVERNANCE_UI_DIRS.some((d) => p.startsWith(d)) ||
    RELEASE_MASTER_UI_TITLE.test(p) ||
    /^governance\/release-master\/.*\.png$/.test(p);
  const ctx = { deletedPrefixes: deleted.prefixes, resolver };

  // 7.2 per-file text · refs
  const info = new Map();
  const workflowMeta = new Map();
  const wranglerMeta = new Map();
  for (const f of inv.files) {
    const ext = path.posix.extname(f).toLowerCase();
    const rec = { path: f, ext, refs: [], envs: [], size: 0, text: null, binary: BINARY_EXT.has(ext) };
    try {
      rec.size = fs.statSync(path.join(ROOT, f)).size;
    } catch {
      rec.size = 0;
    }
    const isOwnOutput = f === OUT_OWNERSHIP || f === OUT_GRAPH || ANALYSIS_ARTIFACT_RE.test(f);
    if (!rec.binary && rec.size <= 8 * 1024 * 1024 && f !== "pnpm-lock.yaml" && !isOwnOutput) {
      const text = readText(f);
      rec.text = text;
      const { refs, envs } = extractRefs(f, text, ctx);
      rec.refs = refs;
      rec.envs = envs;
      if (/^\.github\/workflows\/.*\.ya?ml$/.test(f)) {
        const wf = parseWorkflow(text);
        wf.runRefs = workflowRunRefs(text, rootScripts);
        workflowMeta.set(f, wf);
      }
      if (/wrangler.*\.toml$/.test(f)) wranglerMeta.set(f, parseWrangler(text));
    }
    info.set(f, rec);
  }

  // 7.3 seed classification
  const rules = seedRules();
  const result = new Map();
  for (const f of inv.files) {
    const rule = rules.find((r) => r.test(f));
    result.set(f, {
      path: f,
      class: rule ? rule.cls : "UNKNOWN",
      decision: rule ? rule.decision : "KEEP",
      stage: rule ? rule.stage : STAGE.NONE,
      rule: rule ? rule.id : null,
      reasons: rule ? [rule.reason] : ['시드 규칙 없음'],
      evidence: [],
      referrers: [],
      blockers: [],
      lastCommit: lastCommit.get(f) ? lastCommit.get(f).date : null,
      lastCommitSha: lastCommit.get(f) ? lastCommit.get(f).sha : null,
      sizeBytes: info.get(f).size,
    });
  }

  // 7.4 graph edges
  const GENERIC_DIR_SPECS = new Set(["tooling", "tooling/verify", "tooling/e2e", "tooling/verify/fixtures", "tooling/verify/stubs", "governance", "schemas", "supabase", "supabase/migrations", "services", "services/api-nest", "services/api-nest/src", "workers", "packages", "infra", "docs", "CONSTITUTION", ".cursor", ".cursor/plans", ".cursor/rules", ".github", ".github/workflows", "eval", "scripts"]);
  const edges = [];
  const nodes = new Map();
  const addNode = (id, type, extra) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, ...(extra || {}) });
    return nodes.get(id);
  };
  const addEdge = (from, to, kind, spec) => edges.push({ from, to, kind, ...(spec && spec !== to ? { spec } : {}) });
  for (const f of inv.files) addNode(f, "file");

  for (const f of inv.files) {
    const rec = info.get(f);
    for (const r of rec.refs) {
      if (r.resolvedAs === "external") {
        addNode("pkg:" + r.external, "external-package");
        addEdge(f, "pkg:" + r.external, r.kind, r.spec);
        continue;
      }
      if (r.workspace && !r.targets.length) {
        addNode("pkg:" + r.workspace, "workspace-package", { missing: true });
        addEdge(f, "pkg:" + r.workspace, "pkg-dep", r.spec);
        continue;
      }
      if (r.targets.length === 0) {
        if (r.deleted) {
          addNode("deleted:" + r.spec, "deleted-ui-path");
          addEdge(f, "deleted:" + r.spec, r.kind, r.spec);
        } else if (r.resolvedAs === "missing") {
          addNode("missing:" + r.spec, r.relative ? "missing-relative-import" : "missing-path");
          addEdge(f, "missing:" + r.spec, r.kind, r.spec);
        }
        continue;
      }
      if (r.resolvedAs === "dir" || (r.resolvedAs === "glob" && r.targets.length > 1)) {
        const dirId = "dir:" + r.spec;
        addNode(dirId, r.resolvedAs === "dir" ? "directory" : "glob", { files: r.targets.length });
        addEdge(f, dirId, r.kind, r.spec);
        // generic root-directory literals (e.g. "tooling/verify", "governance") are not ownership evidence for every child
        if (!GENERIC_DIR_SPECS.has(r.spec.replace(/\/+$/, ""))) {
          for (const t of r.targets) result.get(t).referrers.push({ path: f, kind: r.kind, via: r.spec });
        }
        continue;
      }
      for (const t of r.targets) {
        addEdge(f, t, r.kind, r.spec);
        result.get(t).referrers.push({ path: f, kind: r.kind });
      }
    }
    for (const e of rec.envs) {
      addNode("env:" + e, "env-var");
      addEdge(f, "env:" + e, "env");
    }
  }

  // package.json scripts / deps
  for (const [pj, j] of pkgJsonByPath) {
    const dir = pj === "package.json" ? "" : path.posix.dirname(pj) + "/";
    const prefix = pj === "package.json" ? "script:" : "script:" + j.name + "#";
    for (const [name, cmd] of Object.entries(j.scripts || {})) {
      const sid = prefix + name;
      addNode(sid, "npm-script", { package: pj, command: cmd });
      addEdge(pj, sid, "pkg-script", name);
      for (const t of parseScriptTargets(cmd)) {
        if (t.file) {
          const rel = path.posix.normalize(dir + t.file);
          const target = inv.set.has(rel) ? rel : inv.set.has(t.file) ? t.file : null;
          if (target) {
            addEdge(sid, target, t.kind, cmd);
            result.get(target).referrers.push({ path: pj, kind: "pkg-script", via: name });
          } else {
            addNode("missing:" + t.file, "missing-path");
            addEdge(sid, "missing:" + t.file, t.kind, cmd);
          }
        } else if (t.script && j.scripts[t.script]) {
          addEdge(sid, prefix + t.script, "pkg-script", cmd);
        } else if (t.bin) {
          addNode("pkg:" + t.bin, "external-package");
          addEdge(sid, "pkg:" + t.bin, "pkg-dep", cmd);
        }
      }
    }
    for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const [dep, ver] of Object.entries(j[depField] || {})) {
        const ws = workspacePkgs.find((p) => p.name === dep);
        if (ws) {
          addEdge(pj, ws.dir + "/package.json", "pkg-dep", depField + ":" + ver);
          result.get(ws.dir + "/package.json").referrers.push({ path: pj, kind: "pkg-dep", via: depField });
        } else {
          addNode("pkg:" + dep, "external-package");
          addEdge(pj, "pkg:" + dep, "pkg-dep", depField + ":" + ver);
        }
      }
    }
  }

  // workflows
  const workflowsReport = [];
  for (const [wf, meta] of workflowMeta) {
    for (const r of meta.runRefs) {
      if (r.script && rootScripts[r.script] && !r.filter) {
        addEdge(wf, "script:" + r.script, "workflow-run", r.spec);
        for (const t of parseScriptTargets(rootScripts[r.script])) {
          if (t.file && inv.set.has(t.file)) result.get(t.file).referrers.push({ path: wf, kind: "workflow-run", via: r.script });
        }
      } else if (r.filter) {
        const name = r.filter.replace(/\.\.\.$/, "");
        const ws = workspacePkgs.find((p) => p.name === name);
        if (ws) {
          addEdge(wf, ws.dir + "/package.json", "workflow-run", r.spec);
          result.get(ws.dir + "/package.json").referrers.push({ path: wf, kind: "workflow-run", via: r.spec });
        } else {
          addNode("pkg:" + name, "workspace-package", { missing: true });
          addEdge(wf, "pkg:" + name, "workflow-run", r.spec);
        }
      } else if (r.file && inv.set.has(r.file)) {
        addEdge(wf, r.file, "workflow-run", r.spec);
        result.get(r.file).referrers.push({ path: wf, kind: "workflow-run" });
      }
    }
    for (const p of meta.paths) {
      const { targets, kind } = resolver.expandLiteral(p);
      if (kind === "missing") {
        addNode("missing:" + p, "missing-path");
        addEdge(wf, "missing:" + p, "workflow-run", "paths:" + p);
      } else if (targets.length === 1) {
        addEdge(wf, targets[0], "workflow-run", "paths:" + p);
        result.get(targets[0]).referrers.push({ path: wf, kind: "workflow-run", via: "paths" });
      } else {
        addNode("dir:" + p, "glob", { files: targets.length });
        addEdge(wf, "dir:" + p, "workflow-run", "paths:" + p);
        for (const t of targets) result.get(t).referrers.push({ path: wf, kind: "workflow-run", via: "paths:" + p });
      }
    }
    for (const u of meta.uses) {
      const id = "action:" + u.split("@")[0];
      addNode(id, "github-action");
      addEdge(wf, id, "workflow-run", u);
    }
    for (const j of meta.jobs) {
      for (const wd of j.workingDirectory) {
        const { targets } = resolver.expandLiteral(wd);
        if (targets.length) {
          addNode("dir:" + wd, "directory", { files: targets.length });
          addEdge(wf, "dir:" + wd, "workflow-run", "working-directory:" + wd);
        }
      }
    }
    workflowsReport.push({
      file: wf,
      jobs: meta.jobs.map((j) => ({ id: j.id, steps: j.steps.length, noop: j.noop, noopSteps: j.noopSteps, needs: j.needs, if: j.if, timeoutMinutes: j.timeout, strategy: j.strategy })),
      pathsFilter: meta.paths,
      unpinnedUses: meta.uses.filter((u) => !/@[0-9a-f]{40}/.test(u)),
    });
  }

  // wrangler
  for (const [wt, meta] of wranglerMeta) {
    const dir = path.posix.dirname(wt);
    const link = (relTarget, spec) => {
      if (inv.set.has(relTarget)) {
        addEdge(wt, relTarget, "wrangler-main", spec);
        result.get(relTarget).referrers.push({ path: wt, kind: "wrangler-main" });
        return;
      }
      const del = deleted.prefixes.some((p) => relTarget.startsWith(p));
      const id = (del ? "deleted:" : "missing:") + relTarget;
      addNode(id, del ? "deleted-ui-path" : "missing-path");
      addEdge(wt, id, "wrangler-main", spec);
    };
    if (meta.main) link(path.posix.normalize(path.posix.join(dir, meta.main)), meta.main);
    if (meta.assetsDir) link(path.posix.normalize(path.posix.join(dir, meta.assetsDir)), "assets.directory");
    for (const r of meta.routes) {
      addNode("route:" + r, "route");
      addEdge(wt, "route:" + r, "route", r);
    }
    if (meta.name) {
      addNode("worker:" + meta.name, "cloudflare-worker", { config: wt, envs: meta.envs });
      addEdge(wt, "worker:" + meta.name, "wrangler-main", "name");
    }
  }

  // Nest module registry evidence
  const appModule = "services/api-nest/src/app.module.ts";
  if (info.has(appModule) && info.get(appModule).text) {
    const mods = uniq([...info.get(appModule).text.matchAll(/\b([A-Z][A-Za-z0-9]+Module)\b/g)].map((m) => m[1]));
    result.get(appModule).evidence.push({ kind: "nest-module-registry", ref: mods.join(",") });
  }

  // 7.5 evidence summary per file — target side is judged by the target's seed class, not by its path name
  const seedClassOf = (t) => (result.get(t) ? result.get(t).class : null);
  const isUiTarget = (t) => uiPathTest(t) || UI_CLASSES.has(seedClassOf(t));
  const isBeTarget = (t) => !isUiTarget(t) && (BACKEND_CLASSES.has(seedClassOf(t)) || seedClassOf(t) === "FUTURE_ADMIN_REQUIREMENT");
  // self-family and repo-wide bookkeeping files are neutral: asserting `package.json includes "verify:x"` is not domain ownership evidence
  const NEUTRAL_TARGET_RE = /^(tooling\/verify\/|tooling\/backend\/|\.github\/|\.husky\/|\.vscode\/|\.cursor\/|docs\/|quality\/|CONSTITUTION\/|package\.json$|pnpm-workspace\.yaml$|pnpm-lock\.yaml$|AGENTS\.md$|TOOLCHAIN\.md$|\.npmrc$|\.nvmrc$|\.node-version$|\.gitignore$|\.cursorignore$|\.env\.example$|rust-toolchain\.toml$|docker-compose\.dev\.yml$|\.markdownlint)/;
  const isSelfFamily = (t) => NEUTRAL_TARGET_RE.test(t) || seedClassOf(t) === "MIXED" || seedClassOf(t) === "GENERATED";
  const refSide = (r) => {
    if (r.absence) return "neutral";
    if (r.deleted) return "ui";
    // whole-directory / glob scope literals (e.g. "tooling/e2e/", "governance/**") are scope bookkeeping, not domain assertions
    if (r.resolvedAs === "dir" || r.resolvedAs === "glob") return "neutral";
    // release evidence documents are the verifier's own output; only UI-classified governance counts (as UI)
    if (r.targets.length === 1 && /^governance\//.test(r.targets[0]) && !isUiTarget(r.targets[0])) return "neutral";
    const targets = r.targets.filter((t) => !isSelfFamily(t));
    if (!targets.length) return "neutral";
    const ui = targets.filter(isUiTarget).length;
    const be = targets.filter(isBeTarget).length;
    if (targets.length === 1) return ui ? "ui" : be ? "backend" : "neutral";
    if (ui / targets.length >= 0.8) return "ui";
    if (be / targets.length >= 0.5) return "backend";
    return "neutral";
  };
  const UI_MARKER_RE = /(@aipo\/(web|admin|ui)\b|opennextjs|@opennextjs|next (build|lint|dev)|\bnext@|tailwind|lighthouse|@playwright\/test|@axe-core|axe-core|jsdom|storybook)/;
  for (const f of inv.files) {
    const rec = result.get(f);
    const raw = info.get(f);
    for (const r of raw.refs) {
      if (r.resolvedAs === "external") rec.evidence.push({ kind: r.kind, ref: "pkg:" + r.external });
      else if (r.targets.length === 1) rec.evidence.push({ kind: r.kind, ref: r.targets[0] });
      else if (r.targets.length > 1) rec.evidence.push({ kind: r.kind, ref: r.spec + " (" + r.targets.length + " files)" });
      else if (r.deleted) rec.evidence.push({ kind: r.kind, ref: "DELETED_UI:" + r.spec });
      else if (r.workspace) rec.evidence.push({ kind: "pkg-dep", ref: "pkg:" + r.workspace });
      else rec.evidence.push({ kind: r.kind, ref: "MISSING:" + r.spec });
    }
    for (const e of raw.envs) rec.evidence.push({ kind: "env", ref: e });
    const uiRefs = raw.refs.filter((r) => refSide(r) === "ui");
    const beRefs = raw.refs.filter((r) => refSide(r) === "backend");
    const govRefs = raw.refs.filter((r) => r.targets.length === 1 && /^governance\//.test(r.targets[0]) && !isUiTarget(r.targets[0]));
    rec.refSummary = {
      total: raw.refs.length,
      deletedUiRefs: uniq(raw.refs.filter((r) => r.deleted).map((r) => r.spec)),
      uiRefs: uniq(uiRefs.filter((r) => !r.deleted).map((r) => r.spec)),
      backendRefs: uniq(beRefs.map((r) => r.spec)),
      governanceBackendRefs: uniq(govRefs.map((r) => r.spec)),
      sdkOnlyUi: uiRefs.length > 0 && uiRefs.every((r) => !r.deleted && r.targets.every((t) => /^packages\/sdk\//.test(t))),
      browserHarness: !!(raw.text && /(@playwright\/test|require\(["']playwright|chromium|webkit|lighthouse|@axe-core|axe-core|jsdom)/.test(raw.text)),
      uiMarkers: !!(raw.text && UI_MARKER_RE.test(raw.text)),
    };
  }

  // 7.6 evidence-based reclassification — tooling/verify · pwa · release · deploy · recovery · e2e lib · scripts
  // the retired UI stub skip list (former tooling/verify/lib name list) was dismantled in stage 5:
  // UI-only verifiers deleted, mixed verifiers ported to tooling/verify/backend/**, so no name-list branch remains.
  const gateTiers = safeRequire(path.join(ROOT, "tooling/verify/gate-tiers.cjs"));
  const T0 = new Set(gateTiers ? gateTiers.T0_ALWAYS : []);
  const T1 = new Set(gateTiers ? gateTiers.T1_PUSH : []);
  const T2 = new Set(gateTiers ? gateTiers.T2_CI : []);
  const SEED_FINAL_RULES = /^(verify-gate-core|verify-domain-by-path|verify-stack-lock|verify-backend-runner|verify-stubs-runner|verify-lib-ui-capture|verify-catalog|verify-responsive|verify-rc-formal|legacy-plan-verify|deploy-pages|deploy-mixed|pwa-vapid|pwa-webauthn-rp|pwa-webauthn-ux|pwa-day1-cert|pwa-lighthouse|legacy-plan-stamp|e2e-lib-backend|e2e-money-unavailable|e2e-qa-lab)$/;
  const bePathTest = (p) => isBeTarget(p);

  const evidenceTargets = inv.files.filter((f) => /^tooling\/(verify|pwa|release|deploy|recovery|e2e\/lib|e2e\/helpers|schemas|github)\/.*\.(cjs|mjs|js)$/.test(f) || /^scripts\/.*\.mjs$/.test(f));
  for (const f of evidenceTargets) {
    const rec = result.get(f);
    const raw = info.get(f);
    if (!raw.text) continue;
    const base = path.posix.basename(f);
    const sum = rec.refSummary;
    const uiList = [...sum.deletedUiRefs, ...sum.uiRefs];
    const uiCount = uiList.length;
    const beCount = sum.backendRefs.length;
    const tier = T0.has(base) ? "T0" : T1.has(base) || T1.has("stubs/" + base) ? "T1" : T2.has(base) ? "T2" : null;
    if (tier) rec.evidence.push({ kind: "gate-tier", ref: tier });
    if (rec.rule && SEED_FINAL_RULES.test(rec.rule)) {
      if (uiCount) rec.reasons.push('UI 경로 참조 ' + uiCount + ': ' + uiList.slice(0, 6).join(", "));
      continue;
    }
    const isVerify = /^tooling\/verify\//.test(f);
    const breakdown = () => buildMixedBreakdown(raw.text, uiPathTest, bePathTest, deleted.prefixes);
    if (uiCount > 0 && beCount > 0) {
      rec.mixedBreakdown = breakdown();
      const mb = rec.mixedBreakdown;
      setClass(rec, "MIXED", "SPLIT", STAGE.MIXED_SPLIT, 'UI 참조 ' + uiCount + ' + 백엔드 참조 ' + beCount + ' · 백엔드 어서션 ' + mb.backendAssertions.length + ' / UI 어서션 ' + mb.uiAssertions.length);
      continue;
    }
    const govCount = sum.governanceBackendRefs.length;
    if (uiCount > 0) {
      if (sum.sdkOnlyUi) setClass(rec, "CUSTOMER_WEB", "MOVE", STAGE.PACKAGE_CLEANUP, 'packages/sdk만 검사 (' + uiList.slice(0, 4).join(", ") + ') → SDK와 함께 인계');
      else if (govCount > 0 && !sum.browserHarness) {
        // certifies backend release evidence but also asserts a deleted UI path → split, do not delete the evidence gate
        rec.mixedBreakdown = breakdown();
        setClass(rec, "MIXED", "SPLIT", STAGE.MIXED_SPLIT, 'UI 경로 참조 ' + uiCount + ' (' + uiList.slice(0, 3).join(", ") + ') + governance 백엔드 증거 ' + govCount + ' (' + sum.governanceBackendRefs.slice(0, 3).join(", ") + ') · UI 어서션만 제거');
      } else setClass(rec, "OBSOLETE", "DELETE", STAGE.UI_TEST_REMOVAL, '참조 대상이 전부 삭제된/UI 경로 (' + uiList.slice(0, 6).join(", ") + ')' + (sum.browserHarness ? ' · 브라우저 하네스' : ''));
      continue;
    }
    if (beCount > 0) {
      if (isVerify) setClass(rec, rec.class === "BACKEND_INFRA" ? "BACKEND_INFRA" : "BACKEND_TEST", "KEEP", STAGE.NONE, '백엔드 경로만 참조 (' + sum.backendRefs.slice(0, 5).join(", ") + (sum.backendRefs.length > 5 ? " ..." : "") + ')');
      else rec.reasons.push('백엔드 경로 참조 ' + beCount + ' · UI 참조 0');
      continue;
    }
    if (govCount > 0) {
      rec.reasons.push('governance 백엔드 증거만 참조 (' + sum.governanceBackendRefs.slice(0, 4).join(", ") + ') · 시드 유지');
      continue;
    }
    if (sum.uiMarkers) {
      setClass(rec, "OBSOLETE", "DELETE", STAGE.UI_TEST_REMOVAL, '레포 경로 참조 0 · UI 스택 마커(@aipo/web|admin|ui · Next · Tailwind · Lighthouse · Playwright · axe · jsdom) 포함');
      continue;
    }
    rec.reasons.push('레포 경로 참조 0 (순수 로직 또는 도구) · 시드 유지');
  }

  // 7.7a fixtures · e2e docs · pwa harness — inherit from consumers (OBSOLETE when every consumer is OBSOLETE/UI)
  const holderLabel = (r) => r.path + "(" + r.kind + (r.via ? ":" + r.via : "") + ")";
  for (const f of inv.files) {
    const rec = result.get(f);
    if (!/^tooling\/verify\/fixtures\/|^tooling\/e2e\/(expansion|money|persona)\/|^tooling\/e2e\/README\.md$|^tooling\/pwa\//.test(f)) continue;
    if (rec.rule && /^(pwa-|e2e-)/.test(rec.rule) && rec.rule !== "e2e-money-docs" && rec.rule !== "pwa") continue;
    const consumers = rec.referrers.filter((r) => r.kind !== "doc-link" && r.path !== f && !/\.md$/.test(r.path));
    if (!consumers.length) {
      rec.reasons.push('참조 0');
      if (/^tooling\/pwa\//.test(f)) setClass(rec, "OBSOLETE", "DELETE", STAGE.UI_TEST_REMOVAL, '참조 0 · PWA 하네스');
      continue;
    }
    const alive = consumers.filter((r) => !UI_CLASSES.has(result.get(r.path).class));
    if (!alive.length) setClass(rec, "OBSOLETE", "DELETE", STAGE.UI_TEST_REMOVAL, '소비 검증기가 전부 OBSOLETE: ' + uniq(consumers.map((r) => r.path)).slice(0, 3).join(", "));
    else rec.reasons.push('소비: ' + uniq(alive.map((r) => r.path)).slice(0, 3).join(", "));
  }

  // 7.7b governance — reverse references from KEEP/SPLIT *code* holders (docs, fixtures and evidence JSON are not holders)
  // tooling/backend (this generator) is analysis tooling, never an ownership holder
  const HOLDER_CODE_RE = /^(tooling\/(?!verify\/fixtures\/|verify\/CATALOG\.md|backend\/)[^ ]*\.(cjs|mjs|js|ts)$|scripts\/.*\.mjs$|\.github\/workflows\/.*\.ya?ml$|services\/.*|workers\/.*|package\.json$|supabase\/.*)/;
  const keepReferrer = (ref) => {
    const r = result.get(ref.path);
    if (!r || ref.kind === "doc-link" || !HOLDER_CODE_RE.test(ref.path)) return false;
    return (r.decision === "KEEP" || r.decision === "SPLIT") && !UI_CLASSES.has(r.class);
  };
  for (const f of inv.files) {
    if (!/^governance\//.test(f)) continue;
    const rec = result.get(f);
    const holders = rec.referrers.filter(keepReferrer);
    const holderNames = uniq(holders.map(holderLabel));
    const uiHolders = uniq(rec.referrers.filter((r) => !keepReferrer(r) && r.kind !== "doc-link").map((r) => r.path));
    const onlySplit = holders.length > 0 && holders.every((r) => result.get(r.path).decision === "SPLIT");
    if (holders.length && !(onlySplit && (UI_CLASSES.has(rec.class) || rec.class === "UNKNOWN"))) {
      if (UI_CLASSES.has(rec.class) || rec.class === "UNKNOWN") {
        setClass(rec, "BACKEND_DOC", "KEEP", STAGE.NONE, 'KEEP 검증기/워크플로가 읽음: ' + holderNames.slice(0, 4).join(", ") + (holderNames.length > 4 ? " ..." : ""));
      } else {
        rec.reasons.push('보유: ' + holderNames.slice(0, 4).join(", ") + (holderNames.length > 4 ? " ..." : ""));
      }
      continue;
    }
    if (onlySplit) rec.reasons.push('보유 검증기가 전부 SPLIT 대상(' + holderNames.slice(0, 3).join(", ") + ') — 분리 시 UI 부분과 함께 제거 가능 · 내용 기준으로 판정');
    if (rec.class === "UNKNOWN") {
      const score = docKeywordScore(info.get(f).text || "");
      rec.keywordScore = score;
      if (/\.png$/.test(f)) setClass(rec, "OBSOLETE", "DELETE", STAGE.GOVERNANCE_EVIDENCE, '스크린샷 PNG · KEEP 참조 0');
      else if (score.ratio !== null && score.ratio >= 0.6) setClass(rec, "OBSOLETE", "DELETE", STAGE.GOVERNANCE_EVIDENCE, 'KEEP 참조 0 · UI 키워드 비율 ' + score.ratio);
      else if (score.ratio !== null && score.ratio <= 0.3) setClass(rec, "BACKEND_DOC", "KEEP", STAGE.NONE, 'KEEP 참조 0 · 백엔드 키워드 비율 ' + (1 - score.ratio).toFixed(2));
      else rec.reasons.push('키워드 비율 애매(' + JSON.stringify(score) + ') → overrides 필요');
    } else if (UI_CLASSES.has(rec.class)) {
      rec.reasons.push('KEEP 검증기/워크플로 참조 0' + (uiHolders.length ? ' · UI/OBSOLETE/문서 참조자만: ' + uiHolders.slice(0, 3).join(", ") : ''));
    } else if (BACKEND_CLASSES.has(rec.class)) {
      rec.reasons.push('KEEP 검증기 직접 참조 0 · 백엔드 evidence 디렉터리 시드 유지');
    }
  }

  // schemas/*.json consumers
  for (const f of inv.files) {
    if (!/^schemas\/[^/]+\.json$/.test(f)) continue;
    const rec = result.get(f);
    const consumers = rec.referrers.filter((r) => r.kind !== "doc-link");
    const runtime = consumers.filter((r) => /^(services|workers)\//.test(r.path) && !UI_CLASSES.has(result.get(r.path).class));
    const keepVerifiers = consumers.filter((r) => /^(tooling|scripts)\//.test(r.path) && keepReferrer(r));
    const uiOnly = consumers.filter((r) => UI_CLASSES.has(result.get(r.path).class) || /^packages\/sdk\//.test(r.path));
    rec.consumers = { runtime: uniq(runtime.map((r) => r.path)), keepVerifiers: uniq(keepVerifiers.map((r) => r.path)), uiOnly: uniq(uiOnly.map((r) => r.path)) };
    if (runtime.length) rec.reasons.push('런타임 소비: ' + rec.consumers.runtime.slice(0, 3).join(", "));
    else if (keepVerifiers.length) rec.reasons.push('KEEP 검증기 소비: ' + rec.consumers.keepVerifiers.slice(0, 3).join(", "));
    else if (uiOnly.length) setClass(rec, "CUSTOMER_WEB", "MOVE", STAGE.PACKAGE_CLEANUP, '런타임/KEEP 검증기 소비 0 · UI/SDK 소비만: ' + rec.consumers.uiOnly.slice(0, 3).join(", "));
    else setClass(rec, "UNKNOWN", "KEEP", STAGE.PACKAGE_CLEANUP, '소비자 0 (런타임·검증기·UI 모두) → overrides 필요');
  }
  for (const f of inv.files) {
    const rec = result.get(f);
    if (rec.class === "UNKNOWN" && info.get(f).text) rec.keywordScore = docKeywordScore(info.get(f).text);
  }

  // 7.8 overrides (manual decisions · reason required)
  const overridesPath = path.join(ROOT, OVERRIDES_REL);
  const overrides = fs.existsSync(overridesPath) ? JSON.parse(fs.readFileSync(overridesPath, "utf8")) : { entries: [] };
  const overrideHits = new Map();
  for (const o of overrides.entries || []) {
    const re = /[*{]/.test(o.path) ? globToRe(o.path) : null;
    const matched = inv.files.filter((f) => (re ? re.test(f) : f === o.path));
    overrideHits.set(o.path, matched.length);
    if (!CLASSES.includes(o.class) || !DECISIONS.includes(o.decision)) throw new Error("override invalid class/decision: " + o.path);
    if (!o.reason || o.reason.length < 8) throw new Error("override reason required: " + o.path);
    for (const f of matched) {
      const rec = result.get(f);
      rec.class = o.class;
      rec.decision = o.decision;
      rec.stage = o.stage || rec.stage;
      rec.reasons.push("[override] " + o.reason);
      rec.override = true;
      if (o.evidence) rec.evidence.push(...o.evidence.map((e) => ({ kind: "manual", ref: e })));
    }
  }
  const unusedOverrides = [...overrideHits].filter(([, n]) => n === 0).map(([p]) => p);

  // 7.9 blockers — KEEP holders of a DELETE/MOVE/SPLIT target must be edited first
  for (const f of inv.files) {
    const rec = result.get(f);
    if (rec.decision === "KEEP") continue;
    // blockers = KEEP/SPLIT *code* holders with a direct (non-glob, non-directory) reference; SPLIT holders are tagged
    const holders = rec.referrers.filter((r) => {
      const h = result.get(r.path);
      if (!h || (h.decision !== "KEEP" && h.decision !== "SPLIT") || r.kind === "doc-link" || r.path === f) return false;
      if (!HOLDER_CODE_RE.test(r.path) && r.path !== "pnpm-workspace.yaml") return false;
      if (r.via && /[*]|\/$/.test(r.via)) return false;
      return true;
    });
    rec.blockers = uniq(holders.map((r) => holderLabel(r) + (result.get(r.path).decision === "SPLIT" ? "[SPLIT]" : ""))).sort();
  }

  // 7.10 root package.json scripts · devDependencies inheritance
  const scriptOwnership = [];
  for (const [name, cmd] of Object.entries(rootScripts)) {
    const files = parseScriptTargets(cmd).filter((t) => t.file).map((t) => t.file);
    const classes = files.map((fl) => result.get(fl) || null);
    let decision = "KEEP";
    let cls = "BACKEND_INFRA";
    let reason = "";
    if (files.length && classes.every(Boolean)) {
      const anyKeep = classes.some((c) => c.decision === "KEEP");
      const anySplit = classes.some((c) => c.decision === "SPLIT");
      if (classes.every((c) => c.decision === "DELETE" || c.decision === "MOVE")) {
        decision = "DELETE";
        cls = classes[0].class;
        reason = '대상 파일 ' + files.join(", ") + ' → ' + uniq(classes.map((c) => c.decision)).join("/");
      } else if (anySplit && !anyKeep) {
        decision = "SPLIT";
        cls = "MIXED";
        reason = '대상 파일이 SPLIT 대상: ' + files.join(", ");
      } else {
        cls = (classes.find((c) => c.decision === "KEEP") || classes[0]).class;
        reason = '대상 파일 KEEP: ' + files.join(", ");
      }
    } else if (files.length) {
      decision = "DELETE";
      cls = "OBSOLETE";
      reason = '대상 파일이 레포에 없음: ' + files.join(", ");
    } else if (/docker compose/.test(cmd)) reason = 'docker-compose.dev.yml (Phase0 옵션)';
    else if (/wrangler/.test(cmd)) reason = 'wrangler CLI 직접 호출';
    else if (/husky/.test(cmd)) reason = 'husky prepare + plans sync/markdownlint 보조';
    else reason = '체인/외부 명령';
    scriptOwnership.push({ script: name, command: cmd, targets: files, class: cls, decision, reason });
    if (nodes.has("script:" + name)) Object.assign(nodes.get("script:" + name), { class: cls, decision });
  }

  // CLI bins a devDependency provides (only these count as CLI usage; scoped-package short names are NOT bins)
  const DEV_DEP_BINS = { "@playwright/test": ["playwright"], wrangler: ["wrangler"], typescript: ["tsc"], husky: ["husky"] };
  const devDepUsage = [];
  for (const [dep, ver] of Object.entries(rootPkg.devDependencies || {})) {
    const patterns = [
      new RegExp("require\\(\\s*[\"']" + escRe(dep) + "(/[^\"']*)?[\"']"),
      new RegExp("from\\s+[\"']" + escRe(dep) + "(/[^\"']*)?[\"']"),
      new RegExp("import\\(\\s*[\"']" + escRe(dep) + "(/[^\"']*)?[\"']"),
      new RegExp("require\\.resolve\\(\\s*[\"']" + escRe(dep) + "(/[^\"']*)?[\"']"),
    ];
    for (const bin of DEV_DEP_BINS[dep] || []) {
      patterns.push(new RegExp("pnpm\\s+exec\\s+" + escRe(bin) + "\\b"), new RegExp("npx\\s+" + escRe(bin) + "\\b"));
    }
    if (dep === "@cloudflare/workers-types") patterns.push(/@cloudflare\/workers-types/);
    if (dep === "typescript") patterns.push(/typescript\/bin\/tsc|"tsc\b|\btsc -p\b/);
    if (dep === "husky") patterns.push(/\bhusky\b/);
    if (dep === "wrangler") patterns.push(/\bwrangler\s+(deploy|dev|secret|versions|login|whoami)\b|wrangler\.toml/);
    const users = [];
    for (const f of inv.files) {
      const raw = info.get(f);
      if (!raw.text || f === "package.json") continue;
      if (patterns.some((p) => p.test(raw.text))) users.push(f);
    }
    const codeUsers = users.filter((u) => {
      const r = result.get(u);
      return (r.decision === "KEEP" || r.decision === "SPLIT") && !/^(quality|docs|\.cursor\/rules|\.cursor\/plans|CONSTITUTION|governance)\//.test(u) && !/\.md$/.test(u);
    });
    // users that are themselves scheduled for a runner swap in stage 8 do not justify keeping the dependency
    const durableUsers = codeUsers.filter((u) => result.get(u).stage !== STAGE.PACKAGE_CLEANUP);
    const decision = durableUsers.length ? "KEEP" : "DELETE";
    devDepUsage.push({
      dep,
      version: ver,
      users,
      keepUsers: codeUsers,
      decision,
      reason: durableUsers.length
        ? 'KEEP/SPLIT 파일이 사용: ' + durableUsers.slice(0, 6).join(", ") + (durableUsers.length > 6 ? " ..." : "")
        : codeUsers.length
          ? '사용처가 8단계 러너 교체 대상 하네스만: ' + codeUsers.slice(0, 6).join(", ") + ' → 교체 후 제거'
          : users.length
            ? '사용처가 전부 DELETE/MOVE 대상 또는 문서만: ' + users.slice(0, 6).join(", ")
            : '사용처 0',
    });
    addNode("pkg:" + dep, "external-package");
    Object.assign(nodes.get("pkg:" + dep), { rootDevDependency: ver, decision });
  }

  // 7.11 aggregate · write
  const files = inv.files.map((f) => result.get(f));
  for (const rec of files) {
    if (!CLASSES.includes(rec.class)) throw new Error("class vocabulary violation: " + rec.path + " " + rec.class);
    if (!DECISIONS.includes(rec.decision)) throw new Error("decision vocabulary violation: " + rec.path + " " + rec.decision);
    rec.evidence = rec.evidence.slice(0, 40);
    rec.referrers = uniq(rec.referrers.map((r) => r.path + "|" + r.kind + (r.via ? "|" + r.via : ""))).slice(0, 40);
    if (rec.keywordScore == null) delete rec.keywordScore;
    if (rec.refSummary) delete rec.refSummary.total;
  }
  const byClass = {};
  const byDecision = {};
  const byClassDecision = {};
  const dirSummary = {};
  for (const rec of files) {
    byClass[rec.class] = (byClass[rec.class] || 0) + 1;
    byDecision[rec.decision] = (byDecision[rec.decision] || 0) + 1;
    const k = rec.class + "/" + rec.decision;
    byClassDecision[k] = (byClassDecision[k] || 0) + 1;
    const seg = rec.path.split("/");
    const key = seg.length > 2 ? seg[0] + "/" + seg[1] : seg.length === 2 ? seg[0] : "(root)";
    dirSummary[key] = dirSummary[key] || { total: 0, KEEP: 0, DELETE: 0, MOVE: 0, SPLIT: 0 };
    dirSummary[key].total++;
    dirSummary[key][rec.decision]++;
  }
  const unknown = files.filter((r) => r.class === "UNKNOWN").map((r) => ({ path: r.path, reasons: r.reasons, keywordScore: r.keywordScore || null, referrers: r.referrers.slice(0, 10) }));
  // stage 5 result: mixed verifiers were dismantled into tooling/verify/backend/** (see quality/putduk-web-ui-assertions-handoff.md)
  const backendPorts = files.filter((r) => /^tooling\/verify\/backend\/.*\.cjs$/.test(r.path) && r.path !== "tooling/verify/backend/run-all.cjs");
  const backendPortSummary = backendPorts.map((r) => ({ file: r.path, class: r.class, decision: r.decision, backendRefs: r.refSummary ? r.refSummary.backendRefs.length : null }));

  const ownership = {
    generatedAt: new Date().toISOString(),
    headSha,
    generator: "tooling/backend/ownership-graph.cjs",
    overrides: OVERRIDES_REL,
    inputs: { gitLsFiles: inv.files.length, deletedUiPrefixes: deleted.prefixes, deletedUiFilesOnBranch: deleted.deletedFiles.length, deletedByDir: deleted.counts },
    vocabulary: { classes: CLASSES, decisions: DECISIONS, stages: STAGE },
    totals: { byClass, byDecision, byClassDecision, unknown: unknown.length, overridesApplied: (overrides.entries || []).length, overridesUnused: unusedOverrides },
    dirSummary,
    gateTiers: { T0: [...T0], T1: [...T1], T2: [...T2] },
    retiredStubs: { dismantled: true, handoff: "quality/putduk-web-ui-assertions-handoff.md", backendPorts: backendPorts.length, backendPortSummary },
    rootPackage: { scripts: scriptOwnership, devDependencies: devDepUsage },
    workflows: workflowsReport,
    files,
    unknown,
  };
  const graph = {
    generatedAt: ownership.generatedAt,
    headSha,
    edgeKinds: ["import", "require", "dynamic-import", "pkg-dep", "pkg-script", "workflow-run", "wrangler-main", "route", "docker", "deploy-cmd", "env", "test-ref", "verifier-reads", "doc-link"],
    nodes: [...nodes.values()].map((n) => {
      const r = result.get(n.id);
      return r ? { ...n, class: r.class, decision: r.decision } : n;
    }),
    edges,
  };

  return { ownership, graph, files, unknown, unusedOverrides, nodes, edges, byClass, byDecision };
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const { ownership, graph, files, unknown, unusedOverrides, nodes, edges, byClass, byDecision } = build();
  if (checkOnly) {
    const prevPath = path.join(ROOT, OUT_OWNERSHIP);
    const prev = fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, "utf8")) : null;
    const prevMap = new Map((prev ? prev.files : []).map((p) => [p.path, p]));
    const drift = files.filter((f) => {
      const p = prevMap.get(f.path);
      return !p || p.class !== f.class || p.decision !== f.decision;
    });
    console.log("[backend:ownership-graph --check] files=" + files.length + " unknown=" + unknown.length + " drift=" + drift.length);
    for (const d of drift.slice(0, 30)) console.error(" drift " + d.path + " -> " + d.class + "/" + d.decision);
    if (unknown.length || drift.length) process.exit(1);
    return;
  }
  // indent 1 keeps the files diff-reviewable while roughly halving size vs indent 2
  fs.writeFileSync(path.join(ROOT, OUT_OWNERSHIP), JSON.stringify(ownership, null, 1) + "\n");
  fs.writeFileSync(path.join(ROOT, OUT_GRAPH), JSON.stringify(graph, null, 1) + "\n");
  console.log("[backend:ownership-graph] files=" + files.length + " nodes=" + nodes.size + " edges=" + edges.length);
  console.log("  byClass    " + JSON.stringify(byClass));
  console.log("  byDecision " + JSON.stringify(byDecision));
  console.log("  unknown    " + unknown.length + (unusedOverrides.length ? "  unusedOverrides=" + unusedOverrides.length : ""));
  if (unknown.length) {
    for (const u of unknown.slice(0, 80)) console.log("   ? " + u.path + "  " + JSON.stringify(u.keywordScore || {}) + "  " + (u.reasons[u.reasons.length - 1] || ""));
    process.exitCode = 1;
  }
}

module.exports = {
  ROOT,
  OUT_OWNERSHIP,
  OUT_GRAPH,
  OVERRIDES_REL,
  BACKEND_CLASSES,
  UI_CLASSES,
  BINARY_EXT,
  build,
  loadInventory,
  loadDeletedPrefixes,
  git,
  posix,
  globToRe,
  workflowRunRefs,
  CLASSES,
  DECISIONS,
  STAGE,
  DELETED_UI_PREFIXES_STATIC,
  UI_PATH_RULES,
  GOVERNANCE_UI_DIRS,
  GOVERNANCE_BACKEND_DIRS,
  RELEASE_MASTER_UI_TITLE,
  RELEASE_MASTER_BACKEND_TITLE,
  BACKEND_ASSERTION_DOMAINS,
  UI_ASSERTION_DOMAINS,
  seedRules,
  parseWorkflow,
  parseWrangler,
  parseScriptTargets,
  buildMixedBreakdown,
  docKeywordScore,
};

if (require.main === module) main();
