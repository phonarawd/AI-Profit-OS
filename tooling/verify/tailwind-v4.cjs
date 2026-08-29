/**
 * verify:tailwind-v4 — Tailwind CSS v4 + PostCSS + PUTDUK @theme SSOT (ADR-015)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const apps = ["apps/web", "apps/admin"];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function pkgMajor(version) {
  return String(version).replace(/^[\^~>=<\s]*/, "").split(".")[0];
}

for (const app of apps) {
  const rel = `${app}/package.json`;
  if (!fs.existsSync(path.join(root, rel))) {
    fails.push(`missing ${rel}`);
    continue;
  }
  const pkg = JSON.parse(read(rel));
  for (const dep of ["tailwindcss", "@tailwindcss/postcss"]) {
    const version = pkg.devDependencies?.[dep];
    if (!version) {
      fails.push(`${app}: devDependency ${dep} missing`);
      continue;
    }
    if (pkgMajor(version) !== "4") {
      fails.push(`${app}: ${dep} major must be 4 (got ${version})`);
    }
  }

  const postcssPath = `${app}/postcss.config.mjs`;
  if (!fs.existsSync(path.join(root, postcssPath))) {
    fails.push(`missing ${postcssPath}`);
    continue;
  }
  const postcss = read(postcssPath);
  if (!postcss.includes("@tailwindcss/postcss")) {
    fails.push(`${postcssPath}: must use @tailwindcss/postcss plugin`);
  }
  if (postcss.includes("autoprefixer")) {
    fails.push(`${postcssPath}: autoprefixer forbidden (Tailwind v4 handles prefixes)`);
  }

  const globalsPath = `${app}/app/globals.css`;
  if (!fs.existsSync(path.join(root, globalsPath))) {
    fails.push(`missing ${globalsPath}`);
    continue;
  }
  const globals = read(globalsPath);
  if (!globals.includes("@aipo/ui/tokens/putduk-theme.css")) {
    fails.push(`${globalsPath}: must import @aipo/ui/tokens/putduk-theme.css`);
  }
}

const pdThemePath = "packages/ui/tokens/putduk-theme.css";
if (!fs.existsSync(path.join(root, pdThemePath))) {
  fails.push(`missing ${pdThemePath}`);
} else {
  const pdTheme = read(pdThemePath);
  if (!pdTheme.includes('@import "tailwindcss"')) {
    fails.push(`${pdThemePath}: must @import "tailwindcss"`);
  }
  if (!pdTheme.includes("@theme")) {
    fails.push(`${pdThemePath}: must declare @theme PUTDUK tokens`);
  }
  if (!pdTheme.includes('@source "../components"')) {
    fails.push(`${pdThemePath}: must @source "../components" for monorepo UI scan`);
  }
  if (!pdTheme.includes("pretendardvariable-dynamic-subset.min.css")) {
    fails.push(`${pdThemePath}: must load Pretendard webfont`);
  }
}

const uiPkg = JSON.parse(
  fs.readFileSync(path.join(root, "packages/ui/package.json"), "utf8")
);
if (!uiPkg.exports?.["./components/SearchParamsBoundary"]) {
  fails.push("packages/ui must export ./components/SearchParamsBoundary");
}
if (!uiPkg.peerDependencies?.next?.includes("16")) {
  fails.push("packages/ui peerDependencies.next must pin ^16");
}

for (const legacy of [
  "apps/web/tailwind.config.js",
  "apps/web/tailwind.config.ts",
  "apps/admin/tailwind.config.js",
  "apps/admin/tailwind.config.ts",
]) {
  if (fs.existsSync(path.join(root, legacy))) {
    fails.push(`legacy Tailwind config forbidden: ${legacy}`);
  }
}

if (fails.length) {
  console.error("[verify:tailwind-v4] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log("[verify:tailwind-v4] PASS (Tailwind v4 · @tailwindcss/postcss · pd-theme @source)");
