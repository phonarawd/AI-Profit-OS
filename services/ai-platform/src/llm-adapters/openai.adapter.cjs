/**
 * OpenAI adapter — Engine §47.13
 */

"use strict";

const { postJson, openAiCompatText, classifyHttpError } = require("./shared.cjs");

/**
 * @param {object} config
 * @param {string|null} [config.apiKey]
 * @param {string} [config.model]
 * @param {string|null} [config.baseUrl]
 */
function createOpenAiAdapter(config = {}) {
  const apiKey = config.apiKey ? String(config.apiKey) : null;
  const model = String(config.model || "gpt-4o-mini");
  const baseUrl = String(config.baseUrl || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );

  return Object.freeze({
    provider_id: "openai",
    async chat(input = {}) {
      if (!apiKey) {
        return Object.freeze({
          degraded: true,
          provider_id: "openai",
          provider_effective: "none",
          text: "",
          finish_reason: "degraded",
          reason: "missing_api_key",
        });
      }

      const body = {
        model,
        messages: Array.isArray(input.messages) ? input.messages : [],
        max_tokens: Number(input.maxTokens) || 512,
        temperature:
          input.temperature != null ? Number(input.temperature) : 0.3,
        stream: Boolean(input.stream),
      };
      if (Array.isArray(input.tools) && input.tools.length > 0) {
        body.tools = input.tools;
      }

      const res = await postJson({
        url: `${baseUrl}/chat/completions`,
        headers: { authorization: `Bearer ${apiKey}` },
        body,
      });

      if (!res.ok) {
        const kind = classifyHttpError(res.status, res.json);
        return Object.freeze({
          degraded: kind === "quota" || kind === "server",
          provider_id: "openai",
          provider_effective:
            kind === "quota" || kind === "server" ? "none" : "openai",
          text: "",
          finish_reason: kind === "quota" ? "quota" : "error",
          http_status: res.status,
          error_kind: kind,
        });
      }

      return Object.freeze({
        degraded: false,
        provider_id: "openai",
        provider_effective: "openai",
        text: openAiCompatText(res.json),
        finish_reason: "stop",
      });
    },
  });
}

module.exports = { createOpenAiAdapter };
