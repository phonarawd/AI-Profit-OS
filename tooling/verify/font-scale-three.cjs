/**
 * verify:font-scale-three — §50.1 md/lg/xl · Light theme toggle 0 · tokens present
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const pd = fs.readFileSync(
  path.join(root, "packages/ui/tokens/putduk.ts"),
  "utf8"
);
if (!pd.includes("fontScale:")) fails.push("pd-fintech missing fontScale");
for (const k of ["md:", "lg:", "xl:"]) {
  if (!pd.includes(k)) fails.push(`pd-fintech.fontScale missing ${k}`);
}
if (!pd.includes("lightToggleAllowed: false")) {
  fails.push("pd-fintech.theme.lightToggleAllowed must be false");
}

const componentCss = fs.readFileSync(
  path.join(root, "packages/ui/tokens/component.css"),
  "utf8"
);
for (const k of ['data-font-scale="md"', 'data-font-scale="lg"', 'data-font-scale="xl"']) {
  if (!componentCss.includes(k)) fails.push(`component.css missing ${k}`);
}

const settings = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/settings.ts"),
  "utf8"
);
for (const k of ["보통", "크게", "더 크게"]) {
  if (!settings.includes(k)) fails.push(`settings.fontScale label missing ${k}`);
}
if (!settings.includes("themeToggleAllowed") && !settings.includes("themeToggleForbidden")) {
  fails.push("settings must forbid theme toggle");
}

const fontScaleTs = path.join(root, "packages/ui/tokens/font-scale.ts");
if (!fs.existsSync(fontScaleTs)) fails.push("missing tokens/font-scale.ts");

// No Light theme toggle UI strings in web settings stubs
const webSettings = path.join(root, "apps/web/app/me/settings");
if (fs.existsSync(webSettings)) {
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(ent.name)) {
        const t = fs.readFileSync(p, "utf8");
        if (/Dark Mode|시스템 테마|라이트 모드|theme.*toggle/i.test(t)) {
          fails.push(`Light/system theme toggle leak: ${path.relative(root, p)}`);
        }
      }
    }
  };
  walk(webSettings);
}

if (fails.length) {
  console.error("[verify:font-scale-three] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:font-scale-three] PASS (md/lg/xl · PUTDUK dark lock)");
