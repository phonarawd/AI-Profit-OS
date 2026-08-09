/**
 * verify:membership-badge-assets — UI §5.9.2c Brand SVG B안 5종 · 사진목업0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const brandRoot = path.join(root, "packages/ui/brand");

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const grades = ["sprout", "entry", "core", "high", "vip"];
const manPath = path.join(brandRoot, "brand.manifest.json");
if (!fs.existsSync(manPath)) {
  console.error("[verify:membership-badge-assets] FAIL missing brand.manifest.json");
  process.exit(1);
}
const brandMan = JSON.parse(fs.readFileSync(manPath, "utf8"));
if (brandMan.membershipBadges?.status !== "ready") {
  fails.push("brand.manifest membershipBadges.status must be ready");
}
if (!brandMan.membershipBadges?.manifest) {
  fails.push("brand.manifest missing membershipBadges.manifest");
}

const subManPath = path.join(brandRoot, "assets/membership/manifest.json");
if (!fs.existsSync(subManPath)) {
  fails.push("missing assets/membership/manifest.json");
} else {
  const sub = JSON.parse(fs.readFileSync(subManPath, "utf8"));
  const byId = new Map((sub.badges || []).map((b) => [b.id, b]));
  for (const id of grades) {
    const entry = byId.get(id);
    if (!entry) {
      fails.push(`membership manifest missing ${id}`);
      continue;
    }
    if (entry.status !== "ready") {
      fails.push(`${id} status must be ready`);
    }
    const abs = path.join(brandRoot, entry.path || `assets/membership/${id}.svg`);
    if (!fs.existsSync(abs)) {
      fails.push(`missing SVG: ${id}`);
    } else {
      const svg = fs.readFileSync(abs, "utf8");
      if (!svg.includes("<svg")) fails.push(`${id}.svg invalid`);
      if (/\.png|photo|mockup/i.test(svg)) {
        fails.push(`${id}.svg must not embed photo/mockup refs`);
      }
    }
  }
}

// photo mockups must not reappear under membership/
const memDir = path.join(brandRoot, "assets/membership");
if (fs.existsSync(memDir)) {
  for (const name of fs.readdirSync(memDir)) {
    if (/(mockup|photo|\.png)$/i.test(name) && name !== "README.md") {
      if (name.endsWith(".png") || /mockup/i.test(name)) {
        fails.push(`banned membership asset: ${name}`);
      }
    }
  }
}

const badge = read("packages/ui/components/membership/MembershipBadge.tsx");
if (badge && !badge.includes("membershipBadgeSrc") && !badge.includes("/brand/")) {
  fails.push("MembershipBadge must consume Brand SVG path");
}
if (badge && !badge.includes('data-brand-svg="true"')) {
  fails.push('MembershipBadge missing data-brand-svg="true"');
}
if (badge && /🌱|👑/.test(badge) && !badge.includes("sr-only") && !badge.includes("aria")) {
  fails.push("emoji must not be primary badge (aria/sr-only only)");
}

const accessor = read("packages/ui/brand/membership.ts");
for (const id of grades) {
  if (accessor && !accessor.includes(`"${id}"`) && !accessor.includes(`'${id}'`)) {
    fails.push(`brand/membership.ts missing grade ${id}`);
  }
}

const rootPkg = read("package.json");
if (rootPkg && !rootPkg.includes('"verify:membership-badge-assets"')) {
  fails.push("root package.json must define verify:membership-badge-assets");
}

if (fails.length) {
  console.error("[verify:membership-badge-assets] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:membership-badge-assets] PASS (5 Brand SVG · photo mockup 0)",
);
