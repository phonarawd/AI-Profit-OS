/**
 * verify:cute-emoji-palette — §27.10.3 palette · caps · disclaimer body emoji 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const emojiSrc = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/emoji.ts"),
  "utf8"
);
for (const need of ["CUTE_EMOJI_ALLOWED", "CUTE_EMOJI_FORBIDDEN", "EMOJI_CAPS"]) {
  if (!emojiSrc.includes(need)) fails.push(`emoji.ts missing ${need}`);
}
for (const bad of ["🎰", "🃏", "🎲"]) {
  if (!emojiSrc.includes(`"${bad}"`)) {
    fails.push(`CUTE_EMOJI_FORBIDDEN must list ${bad}`);
  }
}

const legal = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/legal.ts"),
  "utf8"
);
const legalBodies = [
  legal.match(/expectedDisclaimer:\s*"([^"]*)"/),
  legal.match(/taxDisclaimer:\s*"([^"]*)"/),
];
for (const m of legalBodies) {
  if (!m) continue;
  const count = (m[1].match(/\p{Extended_Pictographic}/gu) || []).length;
  if (count > 0) fails.push(`legal body must be emoji 0: "${m[1]}"`);
}

const execution = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/execution.ts"),
  "utf8"
);
const cta = execution.match(/ctaEarn:\s*"([^"]*)"/);
if (cta) {
  const count = (cta[1].match(/\p{Extended_Pictographic}/gu) || []).length;
  if (count > 0) fails.push("Primary CTA ctaEarn must be emoji 0");
}

const toast = fs.readFileSync(
  path.join(root, "packages/ui/copy/ko/toast.ts"),
  "utf8"
);
for (const bad of ["🎰", "🃏", "🎲", "🔞", "💀"]) {
  if (toast.includes(bad)) fails.push(`toast.ts contains forbidden ${bad}`);
}

if (fails.length) {
  console.error("[verify:cute-emoji-palette] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("[verify:cute-emoji-palette] PASS (palette · caps · CTA/legal body)");
