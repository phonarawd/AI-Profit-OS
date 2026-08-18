/**
 * verify:age-tone-surfaces — §38.9 toneBand + §27.10 voice pace keys
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

const prefs = read("schemas/user-ux-prefs.v1.json");
if (prefs) {
  for (const band of ["young", "mid", "senior"]) {
    if (!prefs.includes(`"${band}"`)) fails.push(`user-ux-prefs missing toneBand ${band}`);
  }
  for (const scale of ["md", "lg", "xl"]) {
    if (!prefs.includes(`"${scale}"`)) fails.push(`user-ux-prefs missing fontScale ${scale}`);
  }
  if (/light|system|gender/i.test(prefs) && prefs.includes('"theme"')) {
    fails.push("user-ux-prefs must not introduce theme/gender");
  }
}

const onboarding = read("packages/ui/copy/ko/onboarding.ts");
if (onboarding) {
  for (const band of ["young", "mid", "senior"]) {
    if (!onboarding.includes(`${band}:`)) {
      fails.push(`onboarding.ts missing toneBand block ${band}`);
    }
  }
}

const peotteok = read("packages/ui/copy/ko/peotteok.ts");
if (peotteok) {
  for (const k of ["youngPace", "midPace", "seniorPace", "greeting"]) {
    if (!peotteok.includes(`${k}:`)) fails.push(`peotteok.voice missing ${k}`);
  }
}

const settings = read("packages/ui/copy/ko/settings.ts");
if (settings) {
  if (!settings.includes("toneBand:")) fails.push("settings.toneBand missing");
  if (!settings.includes("fontScale:")) fails.push("settings.fontScale missing");
}

// UI §5.9.1a invite toneBand variants (young/mid/senior)
const invite = read("packages/ui/copy/ko/invite.ts");
if (invite) {
  for (const band of ["young", "mid", "senior"]) {
    if (!invite.includes(`${band}:`)) {
      fails.push(`invite.ts missing toneBand block ${band}`);
    }
  }
}

// Gender UI branch strings
const scan = ["packages/ui/copy/ko", "packages/ui/canon/surfaces"];
for (const d of scan) {
  const abs = path.join(root, d);
  if (!fs.existsSync(abs)) continue;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|json)$/.test(ent.name)) {
        const t = fs.readFileSync(p, "utf8");
        if (t.includes("gender_male") || t.includes("gender_female")) {
          fails.push(`gender branch key in ${path.relative(root, p)}`);
        }
      }
    }
  };
  walk(abs);
}

if (fails.length) {
  console.error("[verify:age-tone-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:age-tone-surfaces] PASS (toneBand · voice pace · gender0)");
