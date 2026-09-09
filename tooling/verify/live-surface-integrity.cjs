/**
 * verify:live-surface-integrity — META GATE (top-level mandatory)
 *
 * Purpose: verify that other verify scripts' notion of "live" actually matches
 * governance/runtime-surfaces.v1.json, and that the registry itself matches the
 * real route -> client -> mapper -> presentation import graph.
 *
 * This gate exists because tooling/verify/home-live-wire.cjs (pre-fix) treated
 * fs.existsSync("apps/web/app/HomePageClient.tsx") as proof of live wiring, while
 * the real "/" route mounted HomeDesktopClient. That produced a false-green gate
 * that never inspected the real live source. This meta-gate makes that class of
 * bug structurally detectable repo-wide, not just for the one file we found it in.
 *
 * Three checks:
 *  1. registry shape — every declared file (entry/client/mapper/presentation) exists.
 *  2. reachability — entry actually imports/renders client; client actually
 *     references mapper + presentation (by import/usage, not by existence).
 *  3. legacy-creep guard — scans tooling/verify/*.cjs source for the exact
 *     dangerous pattern `fs.existsSync(<legacyOwnerPath>)` used as a truthiness
 *     gate. Any verify script that still does this for a path listed under any
 *     surface's legacyOwners FAILS this gate, naming the offending file+path.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function abs(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const p = abs(rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function baseName(rel) {
  const m = rel.match(/([^/\\]+)\.[a-z]+$/i);
  return m ? m[1] : rel;
}

// --- load registry ---
const registryPath = "governance/runtime-surfaces.v1.json";
let registry;
try {
  registry = JSON.parse(read(registryPath) || "{}");
} catch (e) {
  console.error(
    `[verify:live-surface-integrity] FAIL\n- registry unreadable/invalid JSON: ${e.message}`,
  );
  process.exit(1);
}

const surfaces = registry.surfaces || {};
if (Object.keys(surfaces).length === 0) {
  fails.push(`${registryPath} declares 0 surfaces`);
}

// --- check 1: registry shape (files must exist) ---
for (const [key, surface] of Object.entries(surfaces)) {
  for (const field of ["entry", "client"]) {
    if (surface[field] && !fs.existsSync(abs(surface[field]))) {
      fails.push(`${key}.${field} does not exist on disk: ${surface[field]}`);
    }
  }
  if (surface.mapper && !fs.existsSync(abs(surface.mapper))) {
    fails.push(`${key}.mapper does not exist on disk: ${surface.mapper}`);
  }
  for (const p of surface.presentation || []) {
    if (!fs.existsSync(abs(p))) {
      fails.push(`${key}.presentation missing on disk: ${p}`);
    }
  }
}

// --- check 2: reachability (entry -> client -> mapper/presentation), by import text ---
for (const [key, surface] of Object.entries(surfaces)) {
  if (!surface.entry || !surface.client) continue;
  const entrySrc = read(surface.entry);
  if (entrySrc == null) continue; // already flagged above

  const clientName = baseName(surface.client);
  if (!entrySrc.includes(clientName)) {
    fails.push(
      `${key}: entry (${surface.entry}) does not reference client component name "${clientName}" — reachability unproven`,
    );
  }

  const clientSrc = read(surface.client);
  if (clientSrc == null) continue;

  if (surface.mapper) {
    const mapperName = baseName(surface.mapper);
    const mapperReferenced =
      clientSrc.includes(mapperName) ||
      (surface.presentation || []).some((p) => {
        const s = read(p);
        return s != null && s.includes(mapperName);
      });
    if (!mapperReferenced) {
      fails.push(
        `${key}: mapper (${surface.mapper}) is not referenced by client or presentation - dangling registry entry`,
      );
    }
  }

  // Transitive reachability: BFS from client across the declared presentation
  // set. A presentation file only has to be referenced by SOME file already
  // known to be reachable (client, or another already-reached presentation
  // file) - not necessarily directly by client. This matches real component
  // trees like client -> ProfitsDesktop -> ProfitsShell -> OpportunityGrid.
  const nodes = new Map(); // baseName -> { path, src }
  nodes.set(baseName(surface.client), { path: surface.client, src: clientSrc });
  for (const p of surface.presentation || []) {
    const s = read(p);
    if (s != null) nodes.set(baseName(p), { path: p, src: s });
  }

  const reached = new Set([baseName(surface.client)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [name, node] of nodes) {
      if (reached.has(name)) continue;
      for (const reachedName of reached) {
        const reachedSrc = nodes.get(reachedName).src;
        if (reachedSrc.includes(name)) {
          reached.add(name);
          grew = true;
          break;
        }
      }
    }
  }

  for (const p of surface.presentation || []) {
    const pName = baseName(p);
    if (!reached.has(pName)) {
      fails.push(
        `${key}: presentation component "${pName}" (${p}) is not transitively reachable from client (${surface.client}) via the declared presentation set`,
      );
    }
  }

  for (const hook of surface.dataHooks || []) {
    if (!clientSrc.includes(hook)) {
      fails.push(`${key}: client (${surface.client}) missing declared dataHook ${hook}`);
    }
  }
}

// --- check 3: legacy-creep guard across the whole verify suite ---
// Build a flat map: legacy path -> owning surface key
const legacyMap = new Map();
for (const [key, surface] of Object.entries(surfaces)) {
  for (const legacy of surface.legacyOwners || []) {
    legacyMap.set(legacy, key);
  }
}

function listCjsFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "fixtures") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...listCjsFiles(p));
    else if (name.endsWith(".cjs")) out.push(p);
  }
  return out;
}

const verifyDir = path.join(root, "tooling/verify");
const verifyFiles = listCjsFiles(verifyDir).filter(
  (p) => path.basename(p) !== "live-surface-integrity.cjs",
);

function stripComments(src) {
  // Remove block and line comments so documentation that quotes the
  // forbidden pattern (e.g. explaining a past bug, as this file's own
  // header does) is not mistaken for executable code.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

for (const file of verifyFiles) {
  const rawSrc = fs.readFileSync(file, "utf8");
  const src = stripComments(rawSrc);
  const relFile = path.relative(root, file).replace(/\\/g, "/");
  for (const [legacyPath] of legacyMap) {
    // Pattern we forbid: fs.existsSync(...<legacyPath fragment>...) used as a
    // live-wiring truthiness signal. We match on the literal path fragment
    // appearing inside an existsSync(...) call anywhere in the file.
    const escaped = legacyPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existsSyncPattern = new RegExp(
      `existsSync\\([^)]*${escaped.split("/").pop()}[^)]*\\)`,
    );
    if (existsSyncPattern.test(src)) {
      fails.push(
        `${relFile}: uses fs.existsSync(...) on legacy path "${legacyPath}" as a live-wiring signal (forbidden pattern) — rewrite against governance/runtime-surfaces.v1.json`,
      );
    }
  }
}

// --- registration ---
// NOTE (2026-09-04): package.json + CATALOG.md registration are both
// pending, for two independent reasons, neither of which affects whether
// this gate actually runs (it does - invoke it directly via
// `node tooling/verify/live-surface-integrity.cjs`):
//  1. package.json is outside the RC seal's evidence-only allowlist
//     (governance/release-master/RC_FORMAL.md, tooling/verify/rc-formal.cjs)
//     - adding a script line there right now would require a full RC
//     re-seal (release-build -> engine-acceptance -> release-acceptance),
//     which is a Founder-level decision, not something to trigger for one
//     npm-script convenience line.
const pkg = read("package.json");
if (!pkg || !pkg.includes('"verify:live-surface-integrity"')) {
  console.warn(
    '[verify:live-surface-integrity] WARN: package.json missing "verify:live-surface-integrity" script (TODO, blocked by RC seal evidence-only allowlist, non-fatal)',
  );
}
// 2. CATALOG.md registration is pending for a separate reason: This session's file-edit
// tooling repeatedly failed ("malformed hook input") on CATALOG.md's existing
// Unicode punctuation (interpunct / em-dash / section-sign) when used as a
// StrReplace anchor or full-file Write payload; this reproduced across 4 attempts
// with otherwise-valid ASCII replacement text. Treated as a known tooling gap, not
// silently dropped: kept as a WARN (non-fatal) so this gate still ships, with an
// explicit TODO to add the CATALOG.md row via a different edit path.
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog || !catalog.includes("live-surface-integrity")) {
  console.warn(
    "[verify:live-surface-integrity] WARN: CATALOG.md missing live-surface-integrity row (TODO, tracked 2026-09-04, non-fatal)",
  );
}

if (fails.length) {
  console.error(
    "[verify:live-surface-integrity] FAIL\n- " + fails.join("\n- "),
  );
  process.exit(1);
}

console.log(
  `[verify:live-surface-integrity] PASS (${Object.keys(surfaces).length} surfaces reachable, ${verifyFiles.length} verify files scanned for legacy-creep, 0 forbidden existsSync patterns)`,
);
