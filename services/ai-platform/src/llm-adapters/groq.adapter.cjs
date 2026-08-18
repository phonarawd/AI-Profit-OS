/**
 * Groq OpenAI-compatible adapter — Engine §47.13
 */

"use strict";

const { createOpenAiAdapter } = require("./openai.adapter.cjs");

/**
 * @param {object} config
 */
function createGroqAdapter(config = {}) {
  const inner = createOpenAiAdapter({
    apiKey: config.apiKey,
    model: config.model || "llama-3.1-8b-instant",
    baseUrl: config.baseUrl || "https://api.groq.com/openai/v1",
  });
  return Object.freeze({
    provider_id: "groq",
    chat: async (input) => {
      const out = await inner.chat(input);
      return Object.freeze({
        ...out,
        provider_id: "groq",
        provider_effective:
          out.provider_effective === "openai" ? "groq" : out.provider_effective,
      });
    },
  });
}

module.exports = { createGroqAdapter };
