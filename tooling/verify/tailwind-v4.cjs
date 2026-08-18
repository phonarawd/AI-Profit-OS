/**
 * verify:tailwind-v4 — Tailwind CSS v4 + PostCSS pin (ADR-015)
 * Consumer Lux @theme import = retired when PendingFigma greenfield.
 * Admin keeps lux-theme.css import (Admin keep-set).
 */
const fs = require("fs");
const path = require("path");
const { isGreenfieldConsumerUi } = require("./lib/greenfield-consumer.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];
const apps = ["apps/web", "apps/admin"];
const greenfield = isGreenfieldConsumerUi();

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
  const hasLux = globals.includes("@aipo/ui/tokens/lux-theme.css");
  if (!hasLux && !(app === "apps/web" && greenfield)) {
    fails.push(`${globalsPath}: must import @aipo/ui/tokens/lux-theme.css`);
  }
}

const luxThemePath = "packages/ui/tokens/lux-theme.css";
if (!fs.existsSync(path.join(root, luxThemePath))) {
  fails.push(`missing ${luxThemePath}`);
} else {
  const luxTheme = read(luxThemePath);
  if (!luxTheme.includes('@import "tailwindcss"')) {
    fails.push(`${luxThemePath}: must @import "tailwindcss"`);
  }
  if (!luxTheme.includes("@theme")) {
    fails.push(`${luxThemePath}: must declare @theme Lux tokens`);
  }
  if (!luxTheme.includes('@source "../components"')) {
    fails.push(`${luxThemePath}: must @source "../components" for monorepo UI scan`);
  }
  if (
    !greenfield &&
    !luxTheme.includes("pretendardvariable-dynamic-subset.min.css")
  ) {
    fails.push(`${luxThemePath}: must load Pretendard webfont`);
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

console.log("[verify:tailwind-v4] PASS (Tailwind v4 · @tailwindcss/postcss · lux-theme @source)");
