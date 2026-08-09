/**
 * LLM Adapter facade — Engine §47.13 Provider Independent
 * Data layer (PG/Redis/Fact) MUST NOT import provider SDKs outside adapters/
 */

"use strict";

const { PROVIDER_IDS } = require("./ai-log.cjs");
const { assertProviderId } = require("./llm-quota.cjs");
const { createNoneAdapter } = require("./llm-adapters/none.adapter.cjs");
const { createOpenAiAdapter } = require("./llm-adapters/openai.adapter.cjs");
const { createGeminiFreeAdapter } = require("./llm-adapters/gemini-free.adapter.cjs");
const { createGroqAdapter } = require("./llm-adapters/groq.adapter.cjs");
const { createOllamaAdapter } = require("./llm-adapters/ollama.adapter.cjs");

/**
 * @typedef {object} LlmChatInput
 * @property {Array<{role:string,content:string}>} messages
 * @property {unknown[]} [tools]
 * @property {boolean} [stream]
 * @property {number} [maxTokens]
 * @property {number} [temperature]
 */

/**
 * @param {string} providerId
 * @param {object} [config]
 */
function createLlmAdapter(providerId, config = {}) {
  const id = assertProviderId(providerId === "none" ? "none" : providerId);
  if (id === "none") return createNoneAdapter(config);
  if (id === "openai") {
    return createOpenAiAdapter({
      apiKey: config.llmApiKey || config.apiKey,
      model: config.openaiModel || config.model,
      baseUrl: config.llmBaseUrl || config.baseUrl,
    });
  }
  if (id === "gemini_free") {
    return createGeminiFreeAdapter({
      apiKey: config.geminiApiKey || config.apiKey,
      model: config.geminiModel || config.model,
    });
  }
  if (id === "groq") {
    return createGroqAdapter({
      apiKey: config.llmApiKey || config.apiKey,
      model: config.groqModel || config.model,
      baseUrl: config.llmBaseUrl || config.baseUrl,
    });
  }
  if (id === "ollama") {
    return createOllamaAdapter({
      baseUrl: config.llmBaseUrl || config.baseUrl,
      model: config.ollamaModel || config.model,
    });
  }
  throw new Error(`LLM_ADAPTER_UNSUPPORTED:${id}`);
}

/**
 * Contract entry — LLMAdapter.chat({ messages, tools?, stream, maxTokens, temperature? })
 * @param {ReturnType<typeof createLlmAdapter>} adapter
 * @param {LlmChatInput} input
 */
async function llmAdapterChat(adapter, input = {}) {
  if (!adapter || typeof adapter.chat !== "function") {
    throw new Error("LLM_ADAPTER_CHAT_INVALID");
  }
  return adapter.chat({
    messages: Array.isArray(input.messages) ? input.messages : [],
    tools: Array.isArray(input.tools) ? input.tools : undefined,
    stream: Boolean(input.stream),
    maxTokens: Number(input.maxTokens) || 512,
    temperature: input.temperature != null ? Number(input.temperature) : undefined,
  });
}

module.exports = {
  PROVIDER_IDS,
  createLlmAdapter,
  llmAdapterChat,
};
