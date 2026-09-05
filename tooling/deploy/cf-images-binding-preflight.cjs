#!/usr/bin/env node
/**
 * cf-images-binding-preflight - D1 6-G (2026-09-04), rewritten by S1C (2026-09-05)
 *
 * Root cause (evidence, not guesswork - see _audit-d0-20260904 session-1b
 * D1-6G write-up for the original chain, and session-1c-correction for the
 * S1C correction that found the original fix/preflight were incomplete):
 *
 *   Cloudflare rejects a Worker script upload with
 *     "Uncaught Error: No such module 'cloudflare/images.js'.
 *      imported from 'worker.js' [code: 10021]"
 *   whenever the built @opennextjs/cloudflare worker.js references the
 *   Cloudflare Images virtual module but the DEPLOYING environment's
 *   Wrangler configuration does not resolve an [images] binding (and no
 *   custom image loader is configured instead). This happens at
 *   Cloudflare's *script validation* step (POST
 *   .../workers/scripts/<name>/versions), i.e. before any request is ever
 *   served - it does NOT matter whether any component in the app actually
 *   renders an image or whether next.config.ts sets `images.unoptimized:
 *   true`. Both are *runtime* behaviour flags; the crashing import is a
 *   *build-time, always-present* reference.
 *
 * S1C CORRECTION (this rewrite): the original D1 6-G fix added only a
 * TOP-LEVEL `[images]` table to infra/web|ops/wrangler.toml, and this
 * script originally only checked for that top-level table's literal text
 * anywhere in the file via `/\[images\]/.test(wholeFileText)`. That is
 * insufficient and was itself unable to catch the real remaining defect:
 *
 *   Wrangler 4.120.0 classifies `images` (and `vars`) as `@nonInheritable`
 *   in its own config schema - confirmed directly against the upstream
 *   source of truth:
 *     https://github.com/cloudflare/workers-sdk/blob/wrangler@4.120.0/packages/workers-utils/src/config/environment.ts
 *   and the public docs:
 *     https://developers.cloudflare.com/workers/wrangler/environments/#non-inheritable-keys-and-environments
 *   Top-level non-inheritable values are NOT carried into `[env.<name>]`
 *   sections - each named environment must declare its own copy. This
 *   repo's actual deploy scripts (tooling/deploy/cf-pages-web.cjs,
 *   cf-pages-ops.cjs, via lib/env.cjs's resolveWranglerEnv()) ALWAYS pass
 *   `--env=preview` or `--env=production` - never a bare no-env deploy - so
 *   a top-level-only [images] table would still leave both real deploy
 *   targets without a resolved IMAGES binding, reproducing the identical
 *   "No such module cloudflare/images.js" failure the original fix set out
 *   to solve. The same non-inheritance applies to `[vars]`.
 *
 * This script now performs a STRUCTURAL, section-aware TOML read (tracking
 * `[section.path]` boundaries, not a whole-file substring/regex scan) and
 * checks EACH of web/ops x preview/production independently:
 *   1. `[env.<environment>.images]` exists with `binding = "IMAGES"`
 *      (exact match) - OR a PROVEN custom image loader (loaderFile must
 *      exist on disk and look like a real function-exporting module, not
 *      just the string "custom" appearing somewhere in next.config).
 *   2. `[env.<environment>.vars]` exists with all of that surface's
 *      required non-secret var keys present and non-empty.
 *
 * Pure static analysis (reads source files only, makes no network calls,
 * requires no Cloudflare credentials) - runs in any environment including
 * this low-spec local host, and is wired into cf-preflight.cjs to run
 * before any Cloudflare credential is requested, let alone any deploy
 * attempt.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Structural TOML section parsing (deliberately NOT a general-purpose TOML
// library - scoped to what this repo's wrangler.toml files actually use:
// single-bracket `[section.path]` headers, no arrays-of-tables, no
// multi-line strings/arrays spanning lines). Section boundaries are tracked
// explicitly so `[images]` and `[env.preview.images]` can never be confused
// with each other, unlike a whole-file substring/regex scan.
// ---------------------------------------------------------------------------

function stripComment(line) {
  // Remove a trailing `# ...` comment, but not one that's inside a quoted
  // string value (e.g. a var value that legitimately contains "#").
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

function parseTomlScalar(raw) {
  const v = raw.trim();
  if (v.length >= 2) {
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v; // inline arrays/tables kept as raw text - not needed for these checks
}

/**
 * @param {string} text
 * @returns {Map<string, Map<string, unknown>>} sectionPath ("" = root) -> Map<key, value>
 */
function parseTomlSections(text) {
  const sections = new Map();
  let current = "";
  sections.set(current, new Map());

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = stripComment(rawLine).trim();
    if (!line) continue;

    const headerMatch = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
    if (headerMatch) {
      current = headerMatch[1];
      if (!sections.has(current)) sections.set(current, new Map());
      continue;
    }

    // Array-of-tables headers ([[x]]) are not used in these files today;
    // isolate them into their own opaque bucket instead of crashing or
    // silently merging into the wrong section if one is ever added.
    const arrayHeaderMatch = /^\[\[([A-Za-z0-9_.-]+)\]\]$/.exec(line);
    if (arrayHeaderMatch) {
      current = `${arrayHeaderMatch[1]}[]`;
      if (!sections.has(current)) sections.set(current, new Map());
      continue;
    }

    const kv = /^([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.+)$/.exec(line);
    if (kv) {
      sections.get(current).set(kv[1], parseTomlScalar(kv[2]));
    }
  }
  return sections;
}

function checkImagesBindingForEnv(sections, env) {
  const sec = sections.get(`env.${env}.images`);
  if (!sec) {
    return { ok: false, reason: `[env.${env}.images] section is missing` };
  }
  const binding = sec.get("binding");
  if (typeof binding !== "string" || binding.length === 0) {
    return { ok: false, reason: `[env.${env}.images] has no "binding" key` };
  }
  if (binding !== "IMAGES") {
    return {
      ok: false,
      reason: `[env.${env}.images] binding is "${binding}", expected exactly "IMAGES"`,
    };
  }
  return { ok: true };
}

function checkVarsForEnv(sections, env, requiredKeys) {
  const sec = sections.get(`env.${env}.vars`);
  if (!sec) {
    return {
      ok: requiredKeys.length === 0,
      missing: requiredKeys.slice(),
      reason:
        requiredKeys.length === 0
          ? null
          : `[env.${env}.vars] section is missing entirely (required: ${requiredKeys.join(", ")})`,
    };
  }
  const missing = requiredKeys.filter((k) => {
    const v = sec.get(k);
    return typeof v !== "string" || v.length === 0;
  });
  return {
    ok: missing.length === 0,
    missing,
    reason: missing.length ? `[env.${env}.vars] missing/empty keys: ${missing.join(", ")}` : null,
  };
}

// ---------------------------------------------------------------------------
// Custom image loader exception - requires actual proof (file exists AND
// looks like a real function-exporting module), not just the string
// "custom" appearing somewhere in next.config.
// ---------------------------------------------------------------------------

function extractImagesConfigBlock(nextConfigSrc) {
  if (!nextConfigSrc) return null;
  const idx = nextConfigSrc.search(/\bimages\s*:\s*\{/);
  if (idx === -1) return null;
  const braceStart = nextConfigSrc.indexOf("{", idx);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < nextConfigSrc.length; i++) {
    const c = nextConfigSrc[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return nextConfigSrc.slice(braceStart, i + 1);
    }
  }
  return null; // unbalanced braces - malformed config, treat as absent rather than guess
}

/**
 * @param {string} appDir absolute path to the app directory (apps/web, apps/admin)
 * @param {string|null} nextConfigSrc contents of that app's next.config.ts/js
 * @param {(absPath: string) => string|null} readFile injectable file reader (for tests)
 */
function hasProvenCustomImageLoader(appDir, nextConfigSrc, readFile) {
  const block = extractImagesConfigBlock(nextConfigSrc);
  if (!block) return { ok: false, reason: "no images{...} block in next.config" };
  if (!/loader\s*:\s*["']custom["']/.test(block)) {
    return { ok: false, reason: 'images{} block has no loader:"custom"' };
  }
  const fileMatch = /loaderFile\s*:\s*["']([^"']+)["']/.exec(block);
  if (!fileMatch) {
    return { ok: false, reason: 'loader:"custom" but no loaderFile path found' };
  }
  const loaderRelPath = fileMatch[1];
  const resolvedPath = path.resolve(appDir, loaderRelPath);
  const src = readFile(resolvedPath);
  if (src == null) {
    return {
      ok: false,
      reason: `loaderFile "${loaderRelPath}" does not resolve to an existing file (checked ${resolvedPath})`,
    };
  }
  const looksLikeFunctionExport =
    /export\s+default\s+function\b/.test(src) ||
    /export\s+default\s+\(/.test(src) ||
    (() => {
      const idMatch = /export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/m.exec(src);
      if (!idMatch) return false;
      const id = idMatch[1];
      return (
        new RegExp(`function\\s+${id}\\s*\\(`).test(src) ||
        new RegExp(`const\\s+${id}\\s*[:=]`).test(src)
      );
    })();
  if (!looksLikeFunctionExport) {
    return {
      ok: false,
      reason: `loaderFile "${loaderRelPath}" exists but does not appear to export a default function - a Next.js custom image loader contract requires one; not proven, not just string-present`,
    };
  }
  return { ok: true, loaderFile: loaderRelPath, resolvedPath };
}

// ---------------------------------------------------------------------------
// Surfaces under check
// ---------------------------------------------------------------------------

const SURFACES = Object.freeze([
  {
    label: "web (ai-profit-web)",
    wranglerPath: "infra/web/wrangler.toml",
    appDir: "apps/web",
    requiredVars: {
      preview: ["APP_NAME", "PLATFORM_NAME"],
      production: ["APP_NAME", "PLATFORM_NAME"],
    },
  },
  {
    label: "ops (ai-profit-ops)",
    wranglerPath: "infra/ops/wrangler.toml",
    appDir: "apps/admin",
    requiredVars: {
      preview: ["APP_NAME", "ROBOTS"],
      production: ["APP_NAME", "ROBOTS"],
    },
  },
]);

const ENVIRONMENTS = Object.freeze(["preview", "production"]);

/**
 * Evaluate one surface's wrangler.toml + next.config text (already read,
 * for testability - no I/O in this function).
 */
function evaluateSurface(surfaceDef, wranglerText, nextConfigText, readFileForLoader) {
  const fails = [];
  const warns = [];
  const perEnv = {};

  if (wranglerText == null) {
    fails.push(`${surfaceDef.label}: missing ${surfaceDef.wranglerPath}`);
    return { label: surfaceDef.label, fails, warns, perEnv };
  }

  const sections = parseTomlSections(wranglerText);

  for (const env of ENVIRONMENTS) {
    if (!sections.has(`env.${env}`)) {
      fails.push(
        `${surfaceDef.label}/${env}: [env.${env}] section itself is missing from ${surfaceDef.wranglerPath}`,
      );
      perEnv[env] = { imagesOk: false, varsOk: false, varsMissing: surfaceDef.requiredVars[env] || [] };
      continue;
    }

    const imagesResult = checkImagesBindingForEnv(sections, env);
    let imagesOk = imagesResult.ok;
    let imagesDetail = imagesResult.ok ? "binding present" : imagesResult.reason;

    if (!imagesOk) {
      const loaderResult = hasProvenCustomImageLoader(surfaceDef.appDir, nextConfigText, readFileForLoader);
      if (loaderResult.ok) {
        imagesOk = true;
        imagesDetail = `proven custom loader exception: ${loaderResult.loaderFile}`;
        warns.push(`${surfaceDef.label}/${env}: using proven custom image loader instead of [images] binding (${loaderResult.loaderFile})`);
      } else {
        fails.push(
          `${surfaceDef.label}/${env}: ${imagesResult.reason} (no proven custom loader exception either: ${loaderResult.reason})`,
        );
      }
    }

    const varsResult = checkVarsForEnv(sections, env, surfaceDef.requiredVars[env] || []);
    if (!varsResult.ok) {
      fails.push(`${surfaceDef.label}/${env}: ${varsResult.reason}`);
    }

    perEnv[env] = {
      imagesOk,
      imagesDetail,
      varsOk: varsResult.ok,
      varsMissing: varsResult.missing || [],
    };
  }

  return { label: surfaceDef.label, fails, warns, perEnv };
}

/**
 * @param {string} rootDir
 * @param {typeof fs} [fsImpl] injectable for tests
 */
function evaluateAll(rootDir, fsImpl) {
  const fsUsed = fsImpl || fs;
  function readFile(p) {
    try {
      return fsUsed.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  }

  const results = SURFACES.map((surfaceDef) => {
    const wranglerText = readFile(path.join(rootDir, surfaceDef.wranglerPath));
    const nextConfigText =
      readFile(path.join(rootDir, surfaceDef.appDir, "next.config.ts")) ||
      readFile(path.join(rootDir, surfaceDef.appDir, "next.config.js"));
    return evaluateSurface(surfaceDef, wranglerText, nextConfigText, readFile);
  });

  return {
    results,
    fails: results.flatMap((r) => r.fails),
    warns: results.flatMap((r) => r.warns),
  };
}

if (require.main === module) {
  const { fails, warns } = evaluateAll(root);
  if (warns.length) {
    console.warn("[cf-images-binding-preflight] WARN\n- " + warns.join("\n- "));
  }
  if (fails.length) {
    console.error("[cf-images-binding-preflight] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    `[cf-images-binding-preflight] PASS (${SURFACES.length} surfaces x ${ENVIRONMENTS.length} named environments checked structurally: [env.<name>.images] binding===\"IMAGES\" or proven custom loader, plus required [env.<name>.vars] keys)`,
  );
}

module.exports = {
  parseTomlSections,
  checkImagesBindingForEnv,
  checkVarsForEnv,
  extractImagesConfigBlock,
  hasProvenCustomImageLoader,
  evaluateSurface,
  evaluateAll,
  SURFACES,
  ENVIRONMENTS,
};
