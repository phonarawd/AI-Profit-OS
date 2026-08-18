/**
 * Ollama local adapter — Engine §47.13
 */

"use strict";

const { postJson, extractAssistantText, classifyHttpError } = require("./shared.cjs");

/**
 * @param {object} config
 * @param {string|null} [config.baseUrl]
 * @param {string} [config.model]
 */
function createOllamaAdapter(config = {}) {
  const baseUrl = String(config.baseUrl || "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );
  const model = String(config.model || "llama3.2");

  return Object.freeze({
    provider_id: "ollama",
    async chat(input = {}) {
      const messages = Array.isArray(input.messages) ? input.messages : [];
      const res = await postJson({
        url: `${baseUrl}/api/chat`,
        body: {
          model,
          messages,
          stream: false,
          options: {
            temperature:
              input.temperature != null ? Number(input.temperature) : 0.3,
            num_predict: Number(input.maxTokens) || 512,
          },
        },
        timeoutMs: 60_000,
      });

      if (!res.ok) {
        const kind = classifyHttpError(res.status, res.json);
        return Object.freeze({
          degraded: true,
          provider_id: "ollama",
          provider_effective: "none",
          text: "",
          finish_reason: kind === "quota" ? "quota" : "error",
          http_status: res.status,
          error_kind: kind,
        });
      }

      return Object.freeze({
        degraded: false,
        provider_id: "ollama",
        provider_effective: "ollama",
        text: extractAssistantText(res.json?.message?.content),
        finish_reason: "stop",
      });
    },
  });
}

module.exports = { createOllamaAdapter };
