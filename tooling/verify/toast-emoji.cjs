/**
 * verify:toast-emoji — §50.2 · §27.10 · user toast emoji 1~2 · forbidden casino
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const toastPath = path.join(root, "packages/ui/copy/ko/toast.ts");
if (!fs.existsSync(toastPath)) {
  console.error("[verify:toast-emoji] FAIL missing toast.ts");
  process.exit(1);
}

const src = fs.readFileSync(toastPath, "utf8");
const emojiRe =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
const forbidden = ["🎰", "🃏", "🎲", "🔞", "💀"];

const entries = [...src.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*"([^"]*)"/gm)];
if (entries.length < 20) {
  fails.push(`expected ≥20 toast codes, got ${entries.length}`);
}

for (const [, code, text] of entries) {
  const matches = text.match(emojiRe) || [];
  // Rough count: unique emoji clusters
  const count = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (count < 1 || count > 2) {
    fails.push(`${code}: emoji count ${count} (need 1~2) · "${text}"`);
  }
  for (const f of forbidden) {
    if (text.includes(f)) fails.push(`${code}: forbidden emoji ${f}`);
  }
}

// busy must match PEOTTEOK sentence lock
if (!src.includes("퍼뜩이 잠시 바빠요")) {
  fails.push("PEOTTEOK_LLM_BUSY sentence lock missing");
}

const adminToast = path.join(root, "packages/ui/copy/ko/admin.ts");
if (fs.existsSync(adminToast)) {
  const a = fs.readFileSync(adminToast, "utf8");
  const adminStrings = [...a.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const s of adminStrings) {
    const count = (s.match(/\p{Extended_Pictographic}/gu) || []).length;
    if (count > 1) fails.push(`admin toast/copy emoji >1: "${s}"`);
  }
}

if (fails.length) {
  console.error("[verify:toast-emoji] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log(`[verify:toast-emoji] PASS (${entries.length} user toasts · emoji 1~2)`);
