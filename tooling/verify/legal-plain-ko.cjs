/**
 * verify:legal-plain-ko — §50.3 plain scripts · DET §50.9 · body emoji 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const pages = [
  "apps/web/app/me/legal/page.tsx",
  "apps/web/app/me/legal/terms/page.tsx",
  "apps/web/app/me/legal/privacy/page.tsx",
  "apps/web/app/me/legal/oss/page.tsx",
  "apps/web/app/me/legal/license/page.tsx",
  "apps/web/app/me/settings/page.tsx",
];
for (const p of pages) {
  if (!fs.existsSync(path.join(root, p))) fails.push(`missing ${p}`);
}

const legal = read("packages/ui/copy/ko/legal.ts");
for (const needle of [
  "termsTitle",
  "privacyTitle",
  "ossTitle",
  "licenseTitle",
  "PRE-OWNED WATCHES L.L.C",
  "1135431",
  "terms:",
  "privacy:",
  "oss:",
  "license:",
]) {
  if (!legal.includes(needle)) fails.push(`legal.ts missing ${needle}`);
}

// Legal body emoji must be 0 (scan string values under terms/privacy/oss/license)
const emojiRe = /\p{Extended_Pictographic}/u;
const bodyChunks = [
  ...legal.matchAll(/(?:intro|body|title):\s*"([^"]*)"/g),
].map((m) => m[1]);
for (const chunk of bodyChunks) {
  if (emojiRe.test(chunk)) {
    fails.push(`legal body must not contain emoji: ${chunk.slice(0, 40)}`);
  }
}

const settings = read("packages/ui/copy/ko/settings.ts");
if (!settings.includes("themeToggleForbidden: true")) {
  fails.push("settings must forbid theme toggle");
}
for (const label of ["보통", "크게", "더 크게"]) {
  if (!settings.includes(label)) fails.push(`fontScale label missing ${label}`);
}

const panel = read("packages/ui/components/settings/SettingsPanel.tsx");
if (!panel.includes('data-theme-toggle-allowed="false"')) {
  fails.push("SettingsPanel must lock theme toggle off");
}
if (!panel.includes("settings-font-scale")) {
  fails.push("SettingsPanel missing font-scale section");
}

const routes = read("apps/web/routes.ts");
for (const r of [
  "/me/legal/terms",
  "/me/legal/privacy",
  "/me/legal/oss",
  "/me/legal/license",
]) {
  if (!routes.includes(`"${r}"`)) {
    fails.push(`USER_NESTED_ROUTES missing ${r}`);
  }
}

if (fails.length) {
  console.error("[verify:legal-plain-ko] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:legal-plain-ko] PASS (약관4종 · DET · fontScale · emoji0)");
