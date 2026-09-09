/**
 * T1 추가 검사 경로 분류.
 * 이 레포 게이트 = 백엔드. 레거시 웹/어드민 extras는 자동 실행하지 않는다.
 * domainSteps()는 여기서 줄이지 않는다. 모르는 경로는 백엔드 T1_PUSH.
 */
"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "../../..");

/** 로컬 푸시마다 항상 (가벼운 백엔드 불변식만) */
const T1_CORE_ALWAYS = [
  "pg-module-scan.cjs",
  "nest-production-provenance.cjs",
];

/** services / supabase / schemas / 백엔드 workers */
const T1_BACKEND = [
  "ebay-worker-deploy-path.cjs",
  "p0-ebay-secret-provisioning.cjs",
  "workers-types.cjs",
  "domain-clock.cjs",
];

/** 레거시 프론트 extras — 목록만 유지, T1/T2 자동 실행 0 */
const T1_FRONTEND = [
  "brand-assets.cjs",
  "next-major-pin.cjs",
  "tailwind-v4.cjs",
  "lux-theme-sync.cjs",
  "dark-leak-guard.cjs",
  "cf-deploy-packages.cjs",
  "no-admin-in-web.cjs",
  "ia-tabs.cjs",
  "admin-routes.cjs",
  "admin-boundary.cjs",
  "opennext-workers-origin.cjs",
  "stubs/run-all.cjs",
];

/** infra · 도메인 매니페스트 */
const T1_SHARED = [
  "cf-infra.cjs",
  "phase0-bootstrap.cjs",
  "root-domain-env.cjs",
  "domain-bootstrap.cjs",
  "workers-types.cjs",
];

function unique(list) {
  return [...new Set(list)];
}

/** fail-closed / 백엔드 T1 전체. 프론트 extras · next-build 없음 */
const T1_PUSH = unique([...T1_CORE_ALWAYS, ...T1_BACKEND, ...T1_SHARED]);

const PRODUCT_TOP = new Set([
  "services",
  "apps",
  "packages",
  "workers",
  "schemas",
  "supabase",
  "infra",
]);

function normalizePath(file) {
  return String(file || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

/**
 * @param {string} file
 * @returns {"docs"|"backend"|"frontend"|"shared"|"full"}
 */
function classifyPath(file) {
  const f = normalizePath(file);
  if (!f) return "full";

  if (
    /^tooling\/verify\/(gate-|t1-by-path|backend-fast)/.test(f) ||
    /^tooling\/verify\/lib\/(gate-stamp|t1-by-path|run-verify-in-process|verify-input-cache)/.test(
      f,
    ) ||
    f === "tooling/verify/stubs/run-all.cjs" ||
    f === "package.json" ||
    f === "pnpm-lock.yaml" ||
    f === "pnpm-workspace.yaml" ||
    f.startsWith(".github/")
  ) {
    return "full";
  }

  if (
    f.startsWith("governance/") ||
    f.startsWith("docs/") ||
    f.startsWith(".cursor/") ||
    f.startsWith("tooling/verify/fixtures/")
  ) {
    return "docs";
  }

  if (
    f.startsWith("apps/web/") ||
    f.startsWith("apps/admin/") ||
    f === "apps/web" ||
    f === "apps/admin" ||
    f.startsWith("packages/ui/") ||
    f.startsWith("packages/sdk/")
  ) {
    return "frontend";
  }

  if (
    f.startsWith("infra/") ||
    f.startsWith("workers/web-proxy/") ||
    f.startsWith("workers/ops-proxy/") ||
    f.startsWith("workers/_shared/") ||
    f === "docker-compose.dev.yml" ||
    f === ".env.example"
  ) {
    return "shared";
  }

  if (
    f.startsWith("services/") ||
    f.startsWith("supabase/") ||
    f.startsWith("schemas/") ||
    f.startsWith("workers/") ||
    f.startsWith("packages/observability")
  ) {
    return "backend";
  }

  const top = f.split("/")[0];
  if (PRODUCT_TOP.has(top)) return "full";
  if (f.startsWith("tooling/")) return "full";
  if (!f.includes("/")) {
    if (/\.(md|txt|png|svg|json)$/i.test(f) || f.startsWith(".")) return "docs";
    return "full";
  }
  return "full";
}

/**
 * @param {string[]} files
 * @param {{ failClosed?: boolean }} [opts]
 */
function t1Plan(files, opts) {
  if (opts && opts.failClosed) {
    return { scripts: [...T1_PUSH], reason: "full-failclosed" };
  }
  const list = Array.isArray(files) ? files.map(normalizePath).filter(Boolean) : [];
  if (list.length === 0) {
    return { scripts: [...T1_CORE_ALWAYS], reason: "empty-core" };
  }
  const lanes = new Set(list.map(classifyPath));
  if (lanes.has("full")) {
    return { scripts: [...T1_PUSH], reason: "full-unknown" };
  }
  const scripts = new Set(T1_CORE_ALWAYS);
  if (lanes.has("backend")) {
    for (const s of T1_BACKEND) scripts.add(s);
  }
  if (lanes.has("shared")) {
    for (const s of T1_SHARED) scripts.add(s);
  }
  const reasonParts = [...lanes].sort();
  if (lanes.has("frontend") && !lanes.has("backend") && !lanes.has("shared")) {
    return { scripts: [...T1_CORE_ALWAYS], reason: "frontend-inventory" };
  }
  const reason = reasonParts.join("+") || "core";
  return { scripts: unique([...scripts]), reason };
}

function t1ExtraSteps(files, opts) {
  return t1Plan(files, opts).scripts;
}

function gitNames(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd: cwd || root,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split(/\r?\n/)
      .map((line) => normalizePath(line.trim()))
      .filter(Boolean);
  } catch {
    return null;
  }
}

function collectLocalPushFiles(cwd) {
  const work = cwd || root;
  const upstream = gitNames(["rev-parse", "--abbrev-ref", "@{upstream}"], work);
  if (!upstream || upstream.length === 0) return null;
  const unpushed = gitNames(["diff", "--name-only", "@{upstream}...HEAD"], work);
  if (!unpushed) return null;
  const staged = gitNames(["diff", "--cached", "--name-only"], work) || [];
  const unstaged = gitNames(["diff", "--name-only"], work) || [];
  return unique([...unpushed, ...staged, ...unstaged]);
}

module.exports = {
  T1_CORE_ALWAYS,
  T1_BACKEND,
  T1_FRONTEND,
  T1_SHARED,
  T1_PUSH,
  classifyPath,
  t1Plan,
  t1ExtraSteps,
  collectLocalPushFiles,
};
