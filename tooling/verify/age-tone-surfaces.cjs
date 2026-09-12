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

// Gender branch keys must not enter the server-side prefs contract either
for (const rel of ["schemas/user-ux-prefs.v1.json", "services/api-nest/src/ux-prefs"]) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const ent of fs.readdirSync(p)) walk(path.join(p, ent));
      return;
    }
    if (!/\.(ts|json)$/.test(p)) return;
    const t = fs.readFileSync(p, "utf8");
    if (t.includes("gender_male") || t.includes("gender_female")) {
      fails.push(`gender branch key in ${path.relative(root, p)}`);
    }
  };
  walk(abs);
}

// copy/ko toneBand · voice pace · invite variants · canon gender scan: UI side (putduk-web handoff 1d)

if (fails.length) {
  console.error("[verify:age-tone-surfaces] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:age-tone-surfaces] PASS (user-ux-prefs toneBand/fontScale · theme/gender 0)");
