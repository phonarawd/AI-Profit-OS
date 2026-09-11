#!/usr/bin/env node
"use strict";
/**
 * backend-repository-boundary — 백엔드 전용 레포 경계 자동검사 (CI job `repository-boundary` · T2)
 *
 *   node tooling/backend/repository-boundary.cjs                     전수 검사 (소유권 그래프를 다시 계산 · <60s 목표)
 *   node tooling/backend/repository-boundary.cjs --json <path>       위반 목록·요약을 JSON으로 저장
 *   node tooling/backend/repository-boundary.cjs --staged            staged 파일만 (pre-commit · 커밋된 소유권 JSON 사용 · <10s 목표)
 *   node tooling/backend/repository-boundary.cjs --paths a,b,c       지정 파일만
 *
 * 규칙 (모두 내용 기반 · 파일명만으로 판정하지 않는다 — 판정 근거는 detail에 남긴다)
 *   ownership          추적 파일 중 소유권 그래프 decision != KEEP 인 파일이 트리에 존재
 *   ui-path            apps/web · apps/admin · packages/ui · next/tailwind/postcss/playwright/lighthouse 설정 ·
 *                      백엔드 사용 증거 없는 CSS/SCSS · 이미지/폰트 · 금지 이름 마커(SparkDash · Toss Premium · Lux)
 *   package            package.json UI 의존성 · pnpm-workspace.yaml 죽은 글롭 · pnpm-lock.yaml importer 잔여
 *   import             services/workers/packages/tooling/scripts 코드가 고객 웹 트리(apps/web · @aipo/web · putduk-web 등)를 직접 읽음.
 *                      예외(숨기지 않음 · warning으로 남김): existsSync(apps/web|apps/admin) 후 FAIL 하는 부재 어서션
 *                      (tooling/deploy/cf-preflight.cjs · tooling/verify/phase0-bootstrap.cjs).
 *   workflow           UI 도구 호출 · echo/true/exit 0 만 있는 step/job · steps 없는 job · UI 이름 job
 *   wrangler           main 이 존재하지 않는 파일 · pages_build_output_dir / assets 정적 사이트 배포
 *   skip-list          retired UI stub 목록 · 무조건 PASS 검증기
 *   markdown           quality/backend-doc-ownership.json keep 목록 밖 .md (없으면 소유권 판정으로 대체 + 경고)
 *
 * 출력: 위반 {rule, path, detail} 목록 · 규칙별/상위 그룹별 카운트 · 위반 1건 이상이면 exit 1.
 * 위반을 숨기기 위한 규칙 완화는 하지 않는다. 지금 트리(8·9·10단계 정리 전)에서는 FAIL 이 정상이며
 * 그 목록은 quality/backend-boundary-violations-baseline.json 으로 후속 단계 to-do 가 된다.
 */

const fs = require("node:fs");
const path = require("node:path");
const og = require("./ownership-graph.cjs");

const ROOT = og.ROOT;
const SELF_FAMILY_RE = /^(tooling\/backend\/|quality\/backend-)/;
const DOC_OWNERSHIP_REL = "quality/backend-doc-ownership.json";

// ── 규칙 데이터 ────────────────────────────────────────────────────────────────
const UI_TREE_PREFIXES = ["apps/web/", "apps/admin/", "packages/ui/"];
const UI_CONFIG_RE = /(^|\/)(next\.config\.[cm]?[jt]s|tailwind\.config\.[cm]?[jt]s|postcss\.config\.[cm]?[jt]s|playwright(\.[a-z0-9-]+)?\.config\.[cm]?[jt]s|lighthouserc[^/]*|\.lighthouse[^/]*)$/;
const STYLE_RE = /\.(css|scss)$/i;
const IMAGE_FONT_RE = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf)$/i;
/** 법률 증빙 스캔(docs/kyb · 시드 규칙 docs-kyb · 편집 금지)은 UI 에셋이 아니다 */
const LEGAL_EVIDENCE_RE = /^docs\/kyb\//;
const NAME_MARKER_RE = /(SparkDash|spark-dash|Toss Premium|toss-premium|\/lux\/|\bLux\b)/;
const MARKER_CONTENT_EXT = /\.(ts|tsx|js|jsx|cjs|mjs|json|jsonc|toml|ya?ml|md|mdc|txt|sql|env|example|sh|ps1)$/i;
const MARKER_HISTORY_ALLOW_RE = /^(quality\/.*\.md|docs\/ADR-[^/]*\.md)$/;
/** KEEP verifiers (rel-601 / observation-registry) and recovery forensic snapshots keep historical UI name markers. Not a hide. */
const MARKER_EVIDENCE_ALLOW_RE = /^(governance\/responsive\/(home-geometry-lock|large-screen-safety)\.v1\.json|governance\/visual-reconciliation\/PUTDUK_UI_VISUAL_MATRIX\.(md|json)|governance\/recovery\/|tooling\/recovery\/)/;

const BANNED_PACKAGES = [
  "next", "react", "react-dom", "tailwindcss", "postcss", "autoprefixer", "@playwright/test", "playwright",
  "axe-core", "lighthouse", "@cloudflare/next-on-pages", "storybook",
];
const BANNED_PACKAGE_PREFIXES = ["@types/react", "@tailwindcss/", "@axe-core/", "@lhci/", "@opennextjs/", "@storybook/", "@next/"];
/** 백엔드 import 증거가 있으면 허용 */
const EVIDENCE_PACKAGES = ["sharp", "jsdom"];

const UI_IMPORT_RE = /(apps\/web|apps\/admin|packages\/ui(\/|["'`])|@aipo\/(web|admin|ui)\b|putduk-web|raw\.githubusercontent\.com\/[^"'`\s]*putduk)/;
const IMPORT_CONTEXT_RE = /(\brequire\(|\bimport\b|\bfrom\s+["'`]|readFileSync|existsSync|readdirSync|statSync|\bjoin\(|\bresolve\(|fetch\()/;
const CODE_SCOPE_RE = /^(services|workers|packages|tooling|scripts)\/.*\.(ts|tsx|js|jsx|cjs|mjs)$/;

const WORKFLOW_UI_TOOL_RE = /(\bplaywright\b|\baxe\b|@axe-core|\blighthouse\b|\blhci\b|\bnext (build|lint|dev|start)\b|opennextjs|\bpages deploy\b|\bbuild:cf\b|next-on-pages)/i;
const WORKFLOW_UI_JOB_RE = /(^|[-_])(ui|spark|axe|lighthouse|cross-browser|web-build|admin-build|webkit|worldclass)([-_]|$)/i;
const AGGREGATOR_RE = /needs\.[A-Za-z0-9_-]+\.result|toJSON\(needs\)|needs\.\*\.result|fromJSON\(|needs\)/;

const SKIP_LIST_RE = /(retired-ui-stubs|isRetiredUiStub|RETIRED_MIXED_UI_STUBS|RETIRED_UI_ONLY_STUBS)/;
const VERIFIER_ASSERT_RE = /(fails\.push|fail\(|\bthrow\b|assert\.|assert\(|process\.exit\(1\)|exitCode\s*=\s*1|expect\(|must\(|\.status\s*!==?\s*0|\bexit\(\s*[1-9])/;
const VERIFIER_PASS_ONLY_RE = /(process\.exit\(0\)|console\.log\([^)]*PASS)/;

// ── 유틸 ────────────────────────────────────────────────────────────────────────
function posix(p) {
  return String(p).replace(/\\/g, "/");
}
function readText(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return null;
  }
}
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}
function parseArgs(argv) {
  const out = { json: null, staged: false, paths: null, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = argv[++i] || null;
    else if (a === "--staged") out.staged = true;
    else if (a === "--paths") out.paths = String(argv[++i] || "").split(",").map((s) => posix(s.trim())).filter(Boolean);
    else if (a === "--quiet") out.quiet = true;
    else if (a.startsWith("--json=")) out.json = a.slice(7);
    else if (a.startsWith("--paths=")) out.paths = a.slice(8).split(",").map((s) => posix(s.trim())).filter(Boolean);
  }
  return out;
}
function stagedFiles() {
  return og
    .git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"])
    .split("\0")
    .filter(Boolean)
    .map(posix);
}
function topGroup(p) {
  const seg = p.split("/");
  if (seg.length === 1) return "(root)";
  return seg.length > 2 ? seg[0] + "/" + seg[1] : seg[0];
}

// ── 소유권 소스 ─────────────────────────────────────────────────────────────────
/** 전수 = 그래프를 다시 계산 · fast = 커밋된 JSON (+ 새 파일은 시드 규칙) */
function loadOwnership(mode, warnings) {
  if (mode === "full") {
    const built = og.build();
    return { source: "ownership-graph.cjs build()", headSha: built.ownership.headSha, files: built.ownership.files, rootPackage: built.ownership.rootPackage };
  }
  const rel = og.OUT_OWNERSHIP;
  const text = readText(rel);
  if (!text) {
    warnings.push(rel + " missing - fast mode falls back to seed rules only");
    return { source: "seed rules only", headSha: null, files: [], rootPackage: null };
  }
  const json = JSON.parse(text);
  return { source: rel + " (committed · headSha " + json.headSha + ")", headSha: json.headSha, files: json.files, rootPackage: json.rootPackage };
}

// ── 검사 본체 ───────────────────────────────────────────────────────────────────
function run(opts) {
  const startedAt = Date.now();
  const warnings = [];
  const violations = [];
  const add = (rule, p, detail) => violations.push({ rule, path: p, detail });

  const inv = og.loadInventory();
  const tracked = inv.set;
  const mode = opts.staged || opts.paths ? "fast" : "full";
  let scope = null;
  if (mode === "fast") {
    const list = opts.paths ? opts.paths : stagedFiles();
    scope = new Set(list.filter((f) => tracked.has(f) || fs.existsSync(path.join(ROOT, f))));
  }
  const inScope = (f) => !scope || scope.has(f);
  const files = inv.files.filter(inScope);
  const allCodeFiles = inv.files; // 증거 탐색은 항상 전체 트리

  const own = loadOwnership(mode, warnings);
  const ownMap = new Map(own.files.map((f) => [f.path, f]));
  const seeds = og.seedRules();
  const decisionOf = (f) => {
    const rec = ownMap.get(f);
    if (rec) return { decision: rec.decision, class: rec.class, stage: rec.stage, reason: (rec.reasons || []).slice(-1)[0] || "", source: "graph" };
    const rule = seeds.find((r) => r.test(f));
    if (rule) return { decision: rule.decision, class: rule.cls, stage: rule.stage, reason: rule.reason + " [seed:" + rule.id + "]", source: "seed" };
    return { decision: "KEEP", class: "UNKNOWN", stage: "-", reason: "no rule", source: "none" };
  };

  // 텍스트 캐시 (전체 트리 · 증거 탐색용)
  const textCache = new Map();
  const textOf = (f) => {
    if (textCache.has(f)) return textCache.get(f);
    const ext = path.posix.extname(f).toLowerCase();
    let t = null;
    if (!og.BINARY_EXT.has(ext) && f !== "pnpm-lock.yaml" && !SELF_FAMILY_RE.test(f)) {
      try {
        const st = fs.statSync(path.join(ROOT, f));
        if (st.size <= 4 * 1024 * 1024) t = fs.readFileSync(path.join(ROOT, f), "utf8");
      } catch {
        t = null;
      }
    }
    textCache.set(f, t);
    return t;
  };
  const keepBackendCode = allCodeFiles.filter((f) => /^(services|workers|packages\/observability|tooling|scripts|supabase)\//.test(f) && /\.(ts|tsx|js|cjs|mjs|sql|toml|json)$/.test(f) && decisionOf(f).decision === "KEEP" && !SELF_FAMILY_RE.test(f));
  const backendUsers = (needle) => keepBackendCode.filter((f) => {
    const t = textOf(f);
    return t != null && t.includes(needle);
  });
  // 에셋 증거: KEEP 백엔드 코드가 쓰거나, governance/.cursor 밖의 KEEP 파일(법률 문서 등)이 참조하면 허용
  const keepNonGovernanceText = allCodeFiles.filter((f) => !/^(governance|\.cursor)\//.test(f) && !og.BINARY_EXT.has(path.posix.extname(f).toLowerCase()) && decisionOf(f).decision === "KEEP" && !SELF_FAMILY_RE.test(f));
  const assetUsers = (needle) => keepNonGovernanceText.filter((f) => {
    const t = textOf(f);
    return t != null && t.includes(needle);
  });

  // markdown 권위 (doc-ownership 이 있으면 그 keep 목록)
  let docKeep = null;
  const docOwnershipText = readText(DOC_OWNERSHIP_REL);
  if (docOwnershipText) {
    try {
      const j = JSON.parse(docOwnershipText);
      docKeep = new Set((j.keep || []).map((x) => (typeof x === "string" ? x : x.path)));
    } catch (e) {
      warnings.push(DOC_OWNERSHIP_REL + " invalid JSON: " + e.message);
    }
  } else {
    warnings.push("doc-ownership not generated (" + DOC_OWNERSHIP_REL + ") - markdown rule falls back to ownership-graph decisions (10th stage)");
  }

  // 1) ownership — decision != KEEP
  for (const f of files) {
    if (SELF_FAMILY_RE.test(f) && /\.json$/.test(f)) continue;
    const d = decisionOf(f);
    if (d.decision === "KEEP") continue;
    if (/\.md$/i.test(f) && docKeep) continue; // markdown 은 doc-ownership 이 권위
    add(/\.md$/i.test(f) ? "markdown" : "ownership", f, d.decision + "/" + d.class + " · " + (d.stage || "-") + " · " + d.reason);
  }
  // markdown — doc-ownership keep 목록 밖
  if (docKeep) {
    for (const f of files) {
      if (!/\.md$/i.test(f)) continue;
      if (!docKeep.has(f)) add("markdown", f, "not in " + DOC_OWNERSHIP_REL + " keep list");
    }
  }

  // 2) ui-path
  for (const f of files) {
    if (SELF_FAMILY_RE.test(f)) continue;
    if (UI_TREE_PREFIXES.some((p) => f.startsWith(p))) add("ui-path", f, "customer/admin UI tree must not exist in the backend repository");
    if (UI_CONFIG_RE.test(f)) add("ui-path", f, "UI build/test configuration file");
    if (STYLE_RE.test(f)) {
      const users = backendUsers(path.posix.basename(f));
      if (!users.length) add("ui-path", f, "stylesheet without backend usage evidence (no KEEP services/workers file references it)");
    }
    if (IMAGE_FONT_RE.test(f) && !LEGAL_EVIDENCE_RE.test(f)) {
      const users = /^governance\//.test(f) ? backendUsers(path.posix.basename(f)) : assetUsers(path.posix.basename(f));
      if (!users.length) add("ui-path", f, "image/font without backend usage evidence" + (/^governance\//.test(f) ? " (screen evidence)" : ""));
    }
    if (NAME_MARKER_RE.test("/" + f)) add("ui-path", f, "forbidden UI name marker in path");
  }
  if (!scope) {
    for (const p of ["apps/web", "apps/admin", "packages/ui", "apps"]) {
      const full = path.join(ROOT, p);
      if (fs.existsSync(full) && !inv.files.some((f) => f.startsWith(p + "/"))) add("ui-path", p + "/", "directory exists on disk (untracked residue)");
    }
  }
  for (const f of files) {
    if (SELF_FAMILY_RE.test(f) || !MARKER_CONTENT_EXT.test(f) || MARKER_HISTORY_ALLOW_RE.test(f) || MARKER_EVIDENCE_ALLOW_RE.test(f)) continue;
    const t = textOf(f);
    if (t == null) continue;
    const m = t.match(NAME_MARKER_RE);
    if (m) {
      const line = t.slice(0, m.index).split("\n").length;
      add("ui-path", f, "forbidden UI name marker in content: " + m[1] + " (line " + line + ")");
    }
  }

  // 3) package — package.json · pnpm-workspace.yaml · pnpm-lock.yaml
  const pkgFiles = files.filter((f) => /(^|\/)package\.json$/.test(f) && !/node_modules/.test(f));
  const isBanned = (dep) => BANNED_PACKAGES.includes(dep) || BANNED_PACKAGE_PREFIXES.some((p) => dep.startsWith(p));
  const evidenceUsers = (dep) => keepBackendCode.filter((f) => {
    const t = textOf(f);
    return t != null && new RegExp("(require\\(\\s*[\"']" + dep + "[\"'/]|from\\s+[\"']" + dep + "[\"'/]|import\\(\\s*[\"']" + dep + "[\"'/])").test(t);
  });
  for (const pj of pkgFiles) {
    let j;
    try {
      j = JSON.parse(String(readText(pj) || "").replace(/^\uFEFF/, ""));
    } catch (e) {
      add("package", pj, "invalid JSON: " + e.message);
      continue;
    }
    const sections = { dependencies: j.dependencies, devDependencies: j.devDependencies, peerDependencies: j.peerDependencies, optionalDependencies: j.optionalDependencies, overrides: j.overrides, "pnpm.overrides": j.pnpm && j.pnpm.overrides };
    for (const [sec, deps] of Object.entries(sections)) {
      for (const dep of Object.keys(deps || {})) {
        if (isBanned(dep)) add("package", pj, sec + ": " + dep + " is a UI/browser toolchain package");
        else if (EVIDENCE_PACKAGES.includes(dep)) {
          const users = evidenceUsers(dep);
          if (!users.length) add("package", pj, sec + ": " + dep + " has no backend import evidence in KEEP code");
        }
      }
    }
    if (pj !== "package.json") {
      const d = decisionOf(pj);
      if (j.peerDependencies && Object.keys(j.peerDependencies).some((k) => /^react/.test(k)) && d.decision === "KEEP") add("package", pj, "workspace package declares a react peerDependency");
    }
  }
  if (inScope("pnpm-workspace.yaml")) {
    const ws = readText("pnpm-workspace.yaml") || "";
    const globs = [...ws.matchAll(/^\s*-\s*["']?([^"'\s#]+)["']?\s*$/gm)].map((m) => m[1]);
    for (const g of globs) {
      const re = og.globToRe(g.replace(/\/+$/, "") + "/package.json");
      const hit = inv.files.some((f) => re.test(f));
      if (!hit) add("package", "pnpm-workspace.yaml", "workspace glob matches no package: " + g);
    }
  }
  if (inScope("pnpm-lock.yaml") && tracked.has("pnpm-lock.yaml")) {
    const lock = fs.readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8").split(/\r?\n/);
    let inImporters = false;
    let importer = null;
    let section = null;
    for (const raw of lock) {
      if (/^importers:\s*$/.test(raw)) {
        inImporters = true;
        continue;
      }
      if (inImporters && /^[A-Za-z]/.test(raw)) break; // next top-level key
      if (!inImporters) continue;
      const imp = raw.match(/^  ([^\s:][^:]*):\s*$/);
      if (imp) {
        importer = imp[1].replace(/^['"]|['"]$/g, "");
        section = null;
        continue;
      }
      const sec = raw.match(/^    (dependencies|devDependencies|optionalDependencies|peerDependencies):\s*$/);
      if (sec) {
        section = sec[1];
        continue;
      }
      const dep = raw.match(/^      ['"]?(@?[^'":\s]+)['"]?:\s*$/);
      if (dep && section) {
        const name = dep[1];
        if (isBanned(name)) add("package", "pnpm-lock.yaml", "importer " + importer + " " + section + ": " + name);
        else if (EVIDENCE_PACKAGES.includes(name) && !evidenceUsers(name).length) add("package", "pnpm-lock.yaml", "importer " + importer + " " + section + ": " + name + " (no backend import evidence)");
      }
    }
  }

  // 4) import — 백엔드 코드가 고객 웹 트리를 직접 읽음
  for (const f of files) {
    if (!CODE_SCOPE_RE.test(f) || SELF_FAMILY_RE.test(f)) continue;
    const t = textOf(f);
    if (t == null) continue;
    const lines = stripComments(t).split(/\r?\n/);
    const hits = [];
    lines.forEach((line, i) => {
      if (!(UI_IMPORT_RE.test(line) && IMPORT_CONTEXT_RE.test(line))) return;
      const window = [line].concat(lines.slice(i + 1, i + 5)).join("\n");
      const absence =
        /existsSync/.test(line) &&
        /(must not (exist|contain)|handed off|FAIL: apps\/(web|admin)|fails\.push\()/.test(window);
      if (absence) {
        warnings.push(f + ":" + (i + 1) + " absence assertion allowed (FAIL if apps/web or apps/admin exists)");
        return;
      }
      hits.push(i + 1);
    });
    if (hits.length) add("import", f, "reads customer web tree (" + hits.length + " line(s): " + hits.slice(0, 5).join(",") + ")");
  }

  // 5) workflow
  const isNoopRun = (run) => {
    const lines = String(run || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !/^set\s+[-+][a-z]+/.test(l));
    if (!lines.length) return true;
    return lines.every((l) => /^(echo\b(?![^>]*>)|true$|exit\s+0$|:$|printf\b(?![^>]*>))/.test(l));
  };
  for (const f of files) {
    if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f)) continue;
    const t = textOf(f);
    if (t == null) continue;
    let wf;
    try {
      wf = og.parseWorkflow(t);
    } catch (e) {
      add("workflow", f, "unparseable workflow: " + e.message);
      continue;
    }
    if (!wf.jobs.length) add("workflow", f, "no jobs parsed");
    for (const job of wf.jobs) {
      if (WORKFLOW_UI_JOB_RE.test(job.id)) add("workflow", f, "job " + job.id + ": UI job name");
      if (!job.steps.length) add("workflow", f, "job " + job.id + ": no steps");
      const runSteps = job.steps.filter((s) => s.run != null && !s.uses);
      const usesSteps = job.steps.filter((s) => s.uses);
      const aggregator = runSteps.some((s) => AGGREGATOR_RE.test(s.run || ""));
      for (const s of runSteps) {
        if (WORKFLOW_UI_TOOL_RE.test(s.run)) add("workflow", f, "job " + job.id + " step " + (s.name || "(unnamed)") + ": UI tool invocation (" + s.run.match(WORKFLOW_UI_TOOL_RE)[0] + ")");
        if (isNoopRun(s.run) && !AGGREGATOR_RE.test(s.run)) add("workflow", f, "job " + job.id + " step " + (s.name || "(unnamed)") + ": no-op run (echo/true/exit 0 only)");
      }
      for (const s of usesSteps) {
        if (WORKFLOW_UI_TOOL_RE.test(s.uses)) add("workflow", f, "job " + job.id + " uses " + s.uses + ": UI action");
      }
      if (job.steps.length && runSteps.length && runSteps.every((s) => isNoopRun(s.run)) && !aggregator) add("workflow", f, "job " + job.id + ": every run step is a no-op");
    }
  }

  // 6) wrangler
  for (const f of files) {
    if (!/^(workers|infra)\/.*wrangler\.(toml|jsonc?)$/.test(f)) continue;
    const t = textOf(f);
    if (t == null) continue;
    const dir = path.posix.dirname(f);
    if (/\.toml$/.test(f)) {
      const meta = og.parseWrangler(t);
      if (!meta.main) add("wrangler", f, "main missing");
      else {
        const target = path.posix.normalize(path.posix.join(dir, meta.main));
        if (!fs.existsSync(path.join(ROOT, target)) || !tracked.has(target)) add("wrangler", f, "main points to a missing file: " + meta.main + " -> " + target);
      }
      if (/^\s*pages_build_output_dir\s*=/m.test(t)) add("wrangler", f, "pages_build_output_dir configures a static site deploy");
      if (/^\s*\[assets\]/m.test(t) || /^\s*assets\s*=\s*\{/m.test(t) || meta.assetsDir) add("wrangler", f, "assets directory configures a static site deploy (" + (meta.assetsDir || "assets") + ")");
    } else {
      let j = null;
      try {
        j = JSON.parse(t.replace(/\/\/.*$/gm, ""));
      } catch {
        j = null;
      }
      if (!j) add("wrangler", f, "unparseable wrangler json");
      else {
        if (!j.main) add("wrangler", f, "main missing");
        else if (!fs.existsSync(path.join(ROOT, path.posix.normalize(path.posix.join(dir, j.main))))) add("wrangler", f, "main points to a missing file: " + j.main);
        if (j.pages_build_output_dir) add("wrangler", f, "pages_build_output_dir configures a static site deploy");
        if (j.assets) add("wrangler", f, "assets configures a static site deploy");
      }
    }
  }

  // 7) skip-list · 무조건 PASS
  for (const f of files) {
    if (!/^(tooling|scripts|\.github|\.husky)\/.*\.(cjs|mjs|js|ts|ya?ml|sh)$/.test(f) || SELF_FAMILY_RE.test(f)) continue;
    const t = textOf(f);
    if (t == null) continue;
    const m = t.match(SKIP_LIST_RE);
    if (m) add("skip-list", f, "retired UI stub skip list reference: " + m[1]);
    if (/^tooling\/verify\/.*\.cjs$/.test(f) && !/(run-all|gate|gate-fast|gate-push|gate-runner|gate-tiers|domain-by-path|domain-by-path-ci)\.cjs$/.test(f)) {
      const body = stripComments(t);
      if (VERIFIER_PASS_ONLY_RE.test(body) && !VERIFIER_ASSERT_RE.test(body) && !/spawnSync|execFileSync|execSync|require\(["']\.\.?\//.test(body)) add("skip-list", f, "verifier passes unconditionally (no assertion · exit(0)/PASS only)");
    }
  }

  // 요약
  const byRule = {};
  const byGroup = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] || 0) + 1;
    const g = topGroup(v.path);
    byGroup[g] = (byGroup[g] || 0) + 1;
  }
  const topGroups = Object.entries(byGroup)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([group, count]) => ({ group, count }));
  return {
    generatedAt: new Date().toISOString(),
    headSha: og.git(["rev-parse", "HEAD"]).trim(),
    mode,
    scope: scope ? [...scope] : null,
    ownershipSource: own.source,
    elapsedMs: Date.now() - startedAt,
    totals: { violations: violations.length, filesChecked: files.length, rules: Object.keys(byRule).length },
    byRule,
    topGroups,
    warnings,
    violations: violations.sort((a, b) => (a.rule + a.path).localeCompare(b.rule + b.path)),
  };
}

function main() {
  const opts = parseArgs(process.argv);
  const report = run(opts);
  if (opts.json) {
    const out = path.isAbsolute(opts.json) ? opts.json : path.join(ROOT, opts.json);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 1) + "\n");
  }
  const tag = "[verify:backend-boundary]";
  for (const w of report.warnings) console.warn(tag + " WARN " + w);
  if (!opts.quiet) {
    for (const v of report.violations) console.log(tag + " " + v.rule.padEnd(10) + " " + v.path + " — " + v.detail);
  }
  console.log(tag + " mode=" + report.mode + " · files=" + report.totals.filesChecked + " · " + report.elapsedMs + "ms · source=" + report.ownershipSource);
  console.log(tag + " byRule " + JSON.stringify(report.byRule));
  console.log(tag + " topGroups " + report.topGroups.slice(0, 10).map((g) => g.group + "=" + g.count).join(" · "));
  if (report.totals.violations) {
    console.error(tag + " FAIL (" + report.totals.violations + " violations)" + (opts.json ? " · saved " + opts.json : ""));
    process.exit(1);
  }
  console.log(tag + " PASS (0 violations)");
}

module.exports = { run, parseArgs, BANNED_PACKAGES, BANNED_PACKAGE_PREFIXES, EVIDENCE_PACKAGES, NAME_MARKER_RE, WORKFLOW_UI_TOOL_RE, WORKFLOW_UI_JOB_RE };

if (require.main === module) main();
