/**
 * QA-5 fault injection probe — harness only · 제품 mutation 0
 *
 * fault injection 훅이 제품/harness에 실재하는지 탐지한다.
 * 없으면 BLOCKED_NO_FAULT_HOOK (mock PASS 금지).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

/** 명시 후보 경로 (존재 + injectable export 필요) */
const CANDIDATE_RELS = [
  "services/api-nest/src/common/fault.ts",
  "services/api-nest/src/common/fault.js",
  "services/api-nest/src/common/fault.cjs",
  "services/api-nest/src/testing/fault-hook.ts",
  "services/api-nest/src/testing/fault-hook.cjs",
  "services/api-nest/src/testing/fault-injector.ts",
  "services/api-nest/src/resilience/fault-injector.ts",
  "tooling/engine-acceptance/hooks/fault-hook.adapter.cjs",
];

/** 런타임 env 훅 이름 — 설정돼도 제품 주입면이 없으면 불충분 */
const ENV_HOOK_KEYS = [
  "AIPO_QA_FAULT",
  "AIPO_QA_INJECT_FAULT",
  "AIPO_INJECT_FAULT",
  "AIPO_FAULT_HOOK",
];

const INJECTABLE_EXPORT_RE =
  /\b(export\s+(async\s+)?function\s+(injectFault|withFault|setFault|clearFault|createFaultInjector)|exports\.(injectFault|withFault|setFault|clearFault|createFaultInjector)\s*=|module\.exports\s*=\s*\{[^}]*(injectFault|withFault|setFault|clearFault|createFaultInjector))/;

/**
 * @returns {{
 *   available: boolean,
 *   blocked_code: null | "BLOCKED_NO_FAULT_HOOK",
 *   findings: string[],
 *   probed_paths: string[],
 *   env_hooks_present: string[],
 *   adapter_rel: string | null,
 * }}
 */
function probeFaultHook() {
  const findings = [];
  const probed_paths = [];
  const existing = [];

  for (const rel of CANDIDATE_RELS) {
    const abs = path.join(ROOT, rel);
    probed_paths.push(rel);
    if (!fs.existsSync(abs)) continue;
    existing.push(rel);
    let body = "";
    try {
      body = fs.readFileSync(abs, "utf8");
    } catch (e) {
      findings.push(`${rel}: unreadable (${e.message})`);
      continue;
    }
    if (INJECTABLE_EXPORT_RE.test(body)) {
      return {
        available: true,
        blocked_code: null,
        findings: [`injectable fault export found at ${rel}`],
        probed_paths,
        env_hooks_present: ENV_HOOK_KEYS.filter((k) => Boolean(process.env[k])),
        adapter_rel: rel,
      };
    }
    findings.push(
      `${rel}: exists but no injectable export (injectFault/withFault/setFault/…)`,
    );
  }

  const scanRoots = [
    "services/api-nest/src/common",
    "services/api-nest/src/testing",
    "services/api-nest/src/resilience",
  ];
  for (const rootRel of scanRoots) {
    const absRoot = path.join(ROOT, rootRel);
    if (!fs.existsSync(absRoot)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(absRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      if (!/^fault/i.test(ent.name)) continue;
      if (!/\.(ts|js|cjs|mts|cts)$/.test(ent.name)) continue;
      const rel = `${rootRel}/${ent.name}`.replace(/\\/g, "/");
      if (probed_paths.includes(rel)) continue;
      probed_paths.push(rel);
      const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
      if (INJECTABLE_EXPORT_RE.test(body)) {
        return {
          available: true,
          blocked_code: null,
          findings: [`injectable fault export found at ${rel}`],
          probed_paths,
          env_hooks_present: ENV_HOOK_KEYS.filter((k) => Boolean(process.env[k])),
          adapter_rel: rel,
        };
      }
      findings.push(`${rel}: fault-named file without injectable export`);
    }
  }

  const env_hooks_present = ENV_HOOK_KEYS.filter((k) => Boolean(process.env[k]));
  if (env_hooks_present.length) {
    findings.push(
      `env present (${env_hooks_present.join(",")}) but no product/harness injectable surface`,
    );
  }
  if (existing.length === 0) {
    findings.push(
      "no candidate fault-hook module under api-nest/common|testing|resilience",
    );
  }

  return {
    available: false,
    blocked_code: "BLOCKED_NO_FAULT_HOOK",
    findings,
    probed_paths,
    env_hooks_present,
    adapter_rel: null,
  };
}

module.exports = {
  probeFaultHook,
  CANDIDATE_RELS,
  ENV_HOOK_KEYS,
};
