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
