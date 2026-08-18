/**
 * verify:brand-asset-provenance — ADR-011 · Redesign R1-2 Part A
 * (`redesign-r1-home-brand-assets` SPLIT A/B · `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`)
 *
 * Brand Kit + markets(+membership) manifest 자산의 provenance 원장:
 *  - SHA-256 + size + (PNG only) pixel dimensions + (home-v2 SVG) root width/height/viewBox를
 *    파일에서 직접 계산해 manifest dimensions와 비교(매니페스트에 재저장하지 않음)
 *  - canonical(`packages/ui/brand/assets/**`) ↔ public mirror(`apps/web/public/brand/assets/**`)
 *    byte-identical 여부(1:1 미러 대상만 — 리사이즈 export 파이프라인은 §PWA_ICON_EXPORTS에서 advisory만)
 *  - 동일 id/file/path 중복 등록 · partnerId 교차 중복 스캔
 *  - ADR-018 §13 "LEGACY VISUAL CANDIDATE — NOT NEW MASTER AUTHORITY" 분류가
 *    실제로 ADR-018 + H1 intake 문서에 텍스트로 존재하는지 cross-check
 *    (legacy Home avatar/hero가 새 Visual Master로 강제 재사용되지 않는다는 governance
 *    linkage를 매 실행마다 재확인 — 본 스크립트가 그 자체로 승격시키지 않음)
 *
 * 이 스크립트는 Home 화면의 새 Visual Master authority를 결정하지 않는다(별도 축).
 * PART B V2(`assets/ai/home-v2`)는 원장/미러/레거시 hash lock만 검사한다 — 승격·삭제는 하지 않는다.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
const brandRoot = path.join(root, "packages/ui/brand");
const publicBrandRoot = path.join(root, "apps/web/public/brand");
const fails = [];
const notes = [];
const ledger = [];

function sha256(absPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

function svgRootBox(svgText) {
  const open = svgText.match(/<svg\b[^>]*>/i);
  if (!open) return null;
  const tag = open[0];
  const width = (tag.match(/\bwidth\s*=\s*"([^"]+)"/i) || [])[1];
  const height = (tag.match(/\bheight\s*=\s*"([^"]+)"/i) || [])[1];
  const viewBox = (tag.match(/\bviewBox\s*=\s*"([^"]+)"/i) || [])[1];
  return { width, height, viewBox };
}

function pngDimensions(absPath) {
  try {
    const buf = fs.readFileSync(absPath);
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buf.length < 26 || !buf.subarray(0, 8).equals(sig)) return null;
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
      bitDepth: buf[24],
      colorType: buf[25],
    };
  } catch {
    return null;
  }
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, "utf8"));
}

function registerAsset(id, relFromBrandRoot, opts = {}) {
  const abs = path.join(brandRoot, relFromBrandRoot);
  const entry = {
    id,
    relFromBrandRoot,
    group: opts.group || "brand",
    exists: fs.existsSync(abs),
    sha256: null,
    size: null,
    dims: null,
  };
  if (entry.exists) {
    const st = fs.statSync(abs);
    entry.size = st.size;
    entry.sha256 = sha256(abs);
    if (/\.png$/i.test(abs)) entry.dims = pngDimensions(abs);
  } else {
    fails.push(`registered but missing on disk: ${id} → ${relFromBrandRoot}`);
  }
  ledger.push(entry);
  return entry;
}

// ---------------------------------------------------------------------------
// 1. Canonical registry — brand.manifest.json core assets
// ---------------------------------------------------------------------------
const brandManPath = path.join(brandRoot, "brand.manifest.json");
if (!fs.existsSync(brandManPath)) {
  console.error("[verify:brand-asset-provenance] FAIL missing brand.manifest.json");
  process.exit(1);
}
const brandMan = readJson(brandManPath);

const coreAssetKeys = ["appIcon", "maskableSource", "wordmarkDark", "aiAvatar", "ogDefault"];
const seenPaths = new Map(); // relPath -> [ids]
for (const key of coreAssetKeys) {
  const a = brandMan.assets?.[key];
  if (!a) {
    fails.push(`brand.manifest.assets.${key} missing`);
    continue;
  }
  if (a.status !== "ready" && a.status !== "archived") {
    fails.push(`brand.manifest.assets.${key}.status must be ready|archived (got ${a.status})`);
  }
  if (a.status === "archived") continue;
  registerAsset(`brand:${key}`, a.path, { group: "brand-core" });
  seenPaths.set(a.path, [...(seenPaths.get(a.path) || []), `brand:${key}`]);
}
// hero illustration (4 derived variants) — registered but NOT treated as Home Visual
// Master authority (ADR-018 §13 · see §5 below).
const hero = brandMan.assets?.heroIllustration;
if (hero) {
  for (const [variantKey, relKey] of [
    ["desktop-webp", "pathDesktop"],
    ["desktop-avif", "pathDesktopAvif"],
    ["mobile-webp", "pathMobile"],
    ["mobile-avif", "pathMobileAvif"],
  ]) {
    if (hero[relKey]) {
      registerAsset(`brand:heroIllustration:${variantKey}`, hero[relKey], {
        group: "brand-core-legacy-hero",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Markets manifest (§38.10.3) — 7 partner logos
// ---------------------------------------------------------------------------
const marketsManPath = path.join(brandRoot, "assets/markets/manifest.json");
let marketsMan = null;
if (!fs.existsSync(marketsManPath)) {
  fails.push("missing assets/markets/manifest.json");
} else {
  marketsMan = readJson(marketsManPath);
  const logos = marketsMan.logos || [];
  const idSeen = new Set();
  const fileSeen = new Map();
  const partnerIdSeen = new Map();
  for (const logo of logos) {
    if (idSeen.has(logo.id)) fails.push(`markets manifest duplicate logo id: ${logo.id}`);
    idSeen.add(logo.id);
    fileSeen.set(logo.file, [...(fileSeen.get(logo.file) || []), logo.id]);
    for (const pid of logo.partnerIds || []) {
      partnerIdSeen.set(pid, [...(partnerIdSeen.get(pid) || []), logo.id]);
    }
    if (logo.status === "ready") {
      registerAsset(`market:${logo.id}`, logo.path, { group: "markets" });
    } else if (logo.status !== "blocked") {
      fails.push(`markets logo ${logo.id} status must be ready|blocked (got ${logo.status})`);
    } else {
      notes.push(`markets logo ${logo.id} status=blocked (tracked, not asset-registered)`);
    }
  }
  for (const [file, ids] of fileSeen) {
    if (ids.length > 1) fails.push(`markets manifest duplicate file registration: ${file} → ${ids.join(", ")}`);
  }
  for (const [pid, ids] of partnerIdSeen) {
    if (ids.length > 1) fails.push(`markets manifest partnerId "${pid}" claimed by multiple logos: ${ids.join(", ")}`);
  }
}

// cross-check schemas/market-partner.registry.json logoAsset ↔ partnerId uniqueness
const registryPath = path.join(root, "schemas/market-partner.registry.json");
if (fs.existsSync(registryPath)) {
  const registry = readJson(registryPath);
  const partnerIds = (registry.partners || []).map((p) => p.partnerId);
  const dupCheck = new Map();
  for (const pid of partnerIds) dupCheck.set(pid, (dupCheck.get(pid) || 0) + 1);
  for (const [pid, n] of dupCheck) {
    if (n > 1) fails.push(`market-partner.registry.json duplicate partnerId: ${pid}`);
  }
} else {
  notes.push("schemas/market-partner.registry.json not found (partnerId cross-check skipped)");
}

// ---------------------------------------------------------------------------
// 3. Membership manifest (§5.9.2c) — 5 grade badges (same brand.manifest tree)
// ---------------------------------------------------------------------------
const membershipManPath = path.join(brandRoot, "assets/membership/manifest.json");
if (fs.existsSync(membershipManPath)) {
  const membershipMan = readJson(membershipManPath);
  const badges = membershipMan.badges || [];
  const idSeen = new Set();
  const fileSeen = new Map();
  for (const b of badges) {
    if (idSeen.has(b.id)) fails.push(`membership manifest duplicate badge id: ${b.id}`);
    idSeen.add(b.id);
    fileSeen.set(b.file, [...(fileSeen.get(b.file) || []), b.id]);
    if (b.status === "ready") {
      registerAsset(`membership:${b.id}`, b.path, { group: "membership" });
    }
  }
  for (const [file, ids] of fileSeen) {
    if (ids.length > 1) fails.push(`membership manifest duplicate file registration: ${file} → ${ids.join(", ")}`);
  }
} else {
  notes.push("assets/membership/manifest.json not found (membership provenance skipped)");
}

// ---------------------------------------------------------------------------
// 3b. Home Visual Master V2 Part B ledger
// ---------------------------------------------------------------------------
const homeV2ManPath = path.join(brandRoot, "assets/ai/home-v2/manifest.json");
if (!fs.existsSync(homeV2ManPath)) {
  fails.push("missing assets/ai/home-v2/manifest.json (Part B V2 ledger)");
} else {
  const homeV2Man = readJson(homeV2ManPath);
  const homeAssets = homeV2Man.assets || [];
  const homeIdSeen = new Set();
  const forbiddenBitmap = /[₩%]|\bUSDT\b|\bKRW\b|2\.8%|1,370|오늘 오후/;
  for (const a of homeAssets) {
    if (homeIdSeen.has(a.id)) fails.push(`home-v2 manifest duplicate id: ${a.id}`);
    homeIdSeen.add(a.id);
    if (a.status !== "ready") {
      fails.push(`home-v2 asset ${a.id} status must be ready (got ${a.status})`);
      continue;
    }
    const entry = registerAsset(`home-v2:${a.id}`, a.path, { group: "home-v2" });
    if (!entry.exists) continue;
    if (a.sha256 && entry.sha256 !== a.sha256) {
      fails.push(`home-v2 hash drift ${a.id}: file=${entry.sha256} manifest=${a.sha256}`);
    }
    if (/\.png$/i.test(a.path)) {
      if (!entry.dims) fails.push(`home-v2 PNG not decodable: ${a.id}`);
      else {
        if (a.dimensions && (entry.dims.width !== a.dimensions.width || entry.dims.height !== a.dimensions.height)) {
          fails.push(
            `home-v2 PNG dims mismatch ${a.id}: file=${entry.dims.width}x${entry.dims.height} manifest=${a.dimensions.width}x${a.dimensions.height}`,
          );
        }
        if (entry.dims.colorType !== 6) {
          fails.push(`home-v2 PNG must be RGBA colorType=6 (${a.id} got ${entry.dims.colorType})`);
        }
      }
    }
    if (/\.svg$/i.test(a.path)) {
      const svg = fs.readFileSync(path.join(brandRoot, a.path), "utf8");
      if (forbiddenBitmap.test(svg)) {
        fails.push(`home-v2 SVG contains forbidden money/percent literal: ${a.id}`);
      }
      if (!svg.includes("<svg")) fails.push(`home-v2 SVG missing <svg>: ${a.id}`);
      const box = svgRootBox(svg);
      if (!box || box.width == null || box.height == null || !box.viewBox) {
        fails.push(`home-v2 SVG root missing width/height/viewBox: ${a.id}`);
      } else {
        const w = Number(box.width);
        const h = Number(box.height);
        if (a.dimensions && (w !== a.dimensions.width || h !== a.dimensions.height)) {
          fails.push(
            `home-v2 SVG dims mismatch ${a.id}: root=${w}x${h} manifest=${a.dimensions.width}x${a.dimensions.height}`,
          );
        }
        const expectedVb = `0 0 ${a.dimensions.width} ${a.dimensions.height}`;
        if (a.dimensions && box.viewBox.trim() !== expectedVb) {
          fails.push(
            `home-v2 SVG viewBox mismatch ${a.id}: root="${box.viewBox}" expected="${expectedVb}"`,
          );
        }
      }
    }
  }
  for (const legacy of homeV2Man.legacyUntouched || []) {
    const abs = path.join(brandRoot, legacy.path);
    if (!fs.existsSync(abs)) {
      fails.push(`legacyUntouched missing (deletion not allowed): ${legacy.path}`);
      continue;
    }
    const actual = sha256(abs);
    if (legacy.sha256 && actual !== legacy.sha256) {
      fails.push(`legacyUntouched hash changed (overwrite not allowed): ${legacy.path}`);
    }
    if (legacy.action && legacy.action !== "NONE") {
      fails.push(`legacyUntouched.action must be NONE: ${legacy.id}`);
    }
  }
  const matrix = homeV2Man.matrix || [];
  if (matrix.length !== 8) fails.push(`home-v2 matrix must have 8 rows (got ${matrix.length})`);
  const allowedVerdicts = new Set([
    "NEW_ASSET_PRODUCED",
    "APPROVED_EXISTING_ASSET_REUSED",
    "NO_ASSET_REQUIRED",
    "FOUNDER_REVIEW_REQUIRED",
  ]);
  for (const row of matrix) {
    if (!allowedVerdicts.has(row.verdict)) {
      fails.push(`home-v2 matrix row ${row.row} has non-final verdict: ${row.verdict}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Public mirror consistency — canonical bytes must equal public mirror bytes
//    (1:1 mirror targets only; resized PWA icon exports are handled in §PWA_ICON below)
// ---------------------------------------------------------------------------
const mirrorGroups = new Set(["markets", "membership", "brand-core-legacy-hero", "home-v2"]);
let mirrorChecked = 0;
let mirrorMissing = 0;
for (const entry of ledger) {
  if (!entry.exists || !mirrorGroups.has(entry.group)) continue;
  if (entry.id === "brand:heroIllustration:desktop-webp" || entry.id === "brand:heroIllustration:desktop-avif" ||
      entry.id === "brand:heroIllustration:mobile-webp" || entry.id === "brand:heroIllustration:mobile-avif" ||
      entry.group === "markets" || entry.group === "membership" || entry.group === "home-v2") {
    // aiAvatar is registered under group brand-core (not mirrorGroups) — handled separately below.
  }
  const publicAbs = path.join(root, "apps/web/public/brand", entry.relFromBrandRoot);
  if (!fs.existsSync(publicAbs)) {
    mirrorMissing++;
    fails.push(`public mirror missing: apps/web/public/brand/${entry.relFromBrandRoot} (canonical: ${entry.id})`);
    continue;
  }
  mirrorChecked++;
  const mirrorHash = sha256(publicAbs);
  if (mirrorHash !== entry.sha256) {
    fails.push(
      `public mirror DRIFT (hash mismatch): ${entry.id} canonical=${entry.sha256.slice(0, 12)} mirror=${mirrorHash.slice(0, 12)}`,
    );
  }
  entry.publicMirrorMatch = mirrorHash === entry.sha256;
}
// aiAvatar also has a 1:1 public mirror (apps/web/public/brand/assets/ai/avatar-512.png)
const aiAvatarEntry = ledger.find((e) => e.id === "brand:aiAvatar");
if (aiAvatarEntry?.exists) {
  const publicAbs = path.join(root, "apps/web/public/brand", aiAvatarEntry.relFromBrandRoot);
  if (!fs.existsSync(publicAbs)) {
    fails.push(`public mirror missing: apps/web/public/brand/${aiAvatarEntry.relFromBrandRoot}`);
  } else {
    mirrorChecked++;
    const mirrorHash = sha256(publicAbs);
    if (mirrorHash !== aiAvatarEntry.sha256) {
      fails.push(`public mirror DRIFT (hash mismatch): brand:aiAvatar`);
    }
    aiAvatarEntry.publicMirrorMatch = mirrorHash === aiAvatarEntry.sha256;
  }
}

// ---------------------------------------------------------------------------
// 5. PWA icon export completeness (advisory only — resize/export is asset
//    production, out of Part A scope; this WARNs, it does not fail the gate)
// ---------------------------------------------------------------------------
const requiredExports = brandMan.exportPipeline?.requiredExports || [];
const pwaIconDir = path.join(root, "apps/web/public/icons");
const pwaFaviconPath = path.join(root, "apps/web/public/favicon.ico");
const missingExports = [];
for (const exp of requiredExports) {
  const abs = exp === "favicon.ico" ? pwaFaviconPath : path.join(pwaIconDir, exp);
  if (!fs.existsSync(abs)) missingExports.push(exp);
}
if (missingExports.length) {
  notes.push(
    `ADVISORY (non-fatal): brand.manifest.exportPipeline.requiredExports missing from apps/web/public: ${missingExports.join(", ")} — resize/export generation is out of Part A scope, report only`,
  );
}

// ---------------------------------------------------------------------------
// 6. Legacy Home avatar/hero — governance linkage cross-check (text presence,
//    not a new authority decision). Confirms ADR-018 + H1 intake doc both
//    classify these exact paths as legacy/non-authoritative before any future
//    Home implementation could otherwise "quietly" reuse them.
// ---------------------------------------------------------------------------
const adr018Path = path.join(brandRoot, "../canon/contracts/ADR-018-peotteok-visual-master-reset.md");
const h1IntakePath = path.join(brandRoot, "../canon/contracts/peotteok-home-visual-master-intake.v1.md");
const legacyNeedles = ["avatar-512.png", "hero-illustration"];
for (const [label, p] of [["ADR-018", adr018Path], ["H1 intake", h1IntakePath]]) {
  if (!fs.existsSync(p)) {
    fails.push(`${label} governance doc missing: ${path.relative(root, p)}`);
    continue;
  }
  const src = fs.readFileSync(p, "utf8");
  for (const needle of legacyNeedles) {
    if (!src.includes(needle)) {
      fails.push(`${label} doc must reference legacy asset "${needle}" under a non-authoritative/legacy classification`);
    }
  }
  if (!/LEGACY|legacy/.test(src)) {
    fails.push(`${label} doc must carry an explicit LEGACY classification`);
  }
}

// ---------------------------------------------------------------------------
// 6b. Cross-registry duplicate CONTENT scan (informational — same bytes under
//    two distinct canonical ids can be legitimate, e.g. a maskable source that
//    intentionally reuses the primary mark, but must be surfaced, not silent).
// ---------------------------------------------------------------------------
const byHash = new Map();
for (const e of ledger) {
  if (!e.sha256) continue;
  byHash.set(e.sha256, [...(byHash.get(e.sha256) || []), e.id]);
}
for (const [hash, ids] of byHash) {
  if (ids.length > 1) {
    notes.push(`duplicate content across distinct ids (same sha256 ${hash.slice(0, 12)}): ${ids.join(" == ")} — confirm intentional before treating either as authoritative-unique`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`[verify:brand-asset-provenance] ledger: ${ledger.length} registered asset(s) · mirror-checked: ${mirrorChecked} (missing=${mirrorMissing})`);
for (const e of ledger) {
  const dims = e.dims ? `${e.dims.width}x${e.dims.height}` : "-";
  const mirror = e.publicMirrorMatch === true ? "MIRROR_OK" : e.publicMirrorMatch === false ? "MIRROR_DRIFT" : "n/a";
  console.log(
    `  ${e.id.padEnd(34)} sha256=${(e.sha256 || "MISSING").slice(0, 16)} size=${e.size ?? "-"} dims=${dims} ${mirror}`,
  );
}
for (const n of notes) console.log(`[verify:brand-asset-provenance] NOTE: ${n}`);

if (fails.length) {
  console.error("[verify:brand-asset-provenance] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(
  `[verify:brand-asset-provenance] PASS (${ledger.length} assets · ${mirrorChecked} mirror-consistent · 0 duplicate/stale · legacy-avatar/hero governance linkage confirmed)`,
);
