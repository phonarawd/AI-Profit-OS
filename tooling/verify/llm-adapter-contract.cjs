/**
 * verify:llm-adapter-contract — Engine §47.13
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const files = [
  "services/ai-platform/src/llm-adapter.cjs",
  "services/ai-platform/src/llm-quota.cjs",
  "services/ai-platform/src/llm-adapters/none.adapter.cjs",
  "services/ai-platform/src/llm-adapters/openai.adapter.cjs",
  "services/ai-platform/src/llm-adapters/gemini-free.adapter.cjs",
  "services/ai-platform/src/llm-adapters/groq.adapter.cjs",
  "services/ai-platform/src/llm-adapters/ollama.adapter.cjs",
  "services/api-nest/src/ai/llm.adapter.service.ts",
  "services/api-nest/src/config/phase0.env.ts",
];
for (const f of files) mustExist(f);

if (fails.length) {
  console.error("[verify:llm-adapter-contract] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));
const phase0 = fs.readFileSync(
  path.join(root, "services/api-nest/src/config/phase0.env.ts"),
  "utf8",
);

for (const id of ["ollama", "groq", "gemini_free", "openai", "none"]) {
  if (!ai.PROVIDER_IDS.includes(id)) {
    fails.push(`PROVIDER_IDS missing ${id}`);
  }
}

for (const id of ai.PROVIDER_IDS) {
  const adapter = ai.createLlmAdapter(id, {});
  if (!adapter || typeof adapter.chat !== "function") {
    fails.push(`createLlmAdapter(${id}) must expose chat()`);
  }
}

(async () => {
  const none = ai.createLlmAdapter("none", {});
  const out = await none.chat({
    messages: [{ role: "user", content: "hi" }],
    stream: false,
    maxTokens: 32,
  });
  if (!out.degraded || out.provider_effective !== "none") {
    fails.push("none adapter must degrade immediately");
  }

  if (!phase0.includes("llmProvider")) {
    fails.push("phase0.env.ts missing llmProvider");
  }
  if (!phase0.includes("openaiModel")) {
    fails.push("phase0.env.ts missing openaiModel");
  }
  if (!phase0.includes("GOOGLE_API_KEY")) {
    fails.push("phase0.env.ts must accept official GOOGLE_API_KEY alias");
  }
  if (!phase0.includes("NEXT_PUBLIC 0")) {
    fails.push("phase0.env.ts must document NEXT_PUBLIC 0 for LLM keys");
  }

  const geminiSrc = fs.readFileSync(
    path.join(root, "services/ai-platform/src/llm-adapters/gemini-free.adapter.cjs"),
    "utf8",
  );
  if (!geminiSrc.includes("x-goog-api-key")) {
    fails.push("gemini adapter must send x-goog-api-key header (2026 official)");
  }
  if (/\?key=/.test(geminiSrc)) {
    fails.push("gemini adapter must not put API key in URL query");
  }
  if (!geminiSrc.includes("systemInstruction")) {
    fails.push("gemini adapter must map system messages to systemInstruction");
  }

  const nestLlm = fs.readFileSync(
    path.join(root, "services/api-nest/src/ai/llm.adapter.service.ts"),
    "utf8",
  );
  if (!/stream:\s*false/.test(nestLlm)) {
    fails.push("LlmAdapterService must force provider stream=false");
  }
  if (/createLlmAdapter\(\s*["']openai["']/.test(nestLlm) && /createLlmAdapter\(\s*["']gemini/.test(nestLlm)) {
    fails.push("must not instantiate a second product coach per provider");
  }

  const nextPublicNeedles = [
    "NEXT_PUBLIC_OPENAI_API_KEY",
    "NEXT_PUBLIC_GEMINI_API_KEY",
    "NEXT_PUBLIC_LLM_API_KEY",
    "NEXT_PUBLIC_GOOGLE_API_KEY",
  ];
  const scanRoots = [
    path.join(root, "apps"),
    path.join(root, "packages/sdk"),
    path.join(root, "packages/ui"),
  ];
  function walk(dir, acc) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules" || name === ".next" || name === "dist") continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p, acc);
      else if (/\.(ts|tsx|js|cjs|mjs)$/.test(name)) acc.push(p);
    }
  }
  const filesToScan = [];
  for (const d of scanRoots) walk(d, filesToScan);
  for (const fp of filesToScan) {
    const txt = fs.readFileSync(fp, "utf8");
    for (const n of nextPublicNeedles) {
      if (txt.includes(n)) {
        fails.push(`CLIENT_API_KEY_EXPOSURE: ${path.relative(root, fp)} has ${n}`);
      }
    }
  }

  const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
  if (!pkg.includes("verify:llm-adapter-contract")) {
    fails.push("package.json missing verify:llm-adapter-contract script");
  }

  if (fails.length) {
    console.error(
      "[verify:llm-adapter-contract] FAIL\n- " + fails.join("\n- "),
    );
    process.exit(1);
  }
  console.log("[verify:llm-adapter-contract] PASS");
})();
