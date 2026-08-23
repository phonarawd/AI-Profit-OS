/**
 * Gemini adapter — Engine §47.13
 * Official REST (2026): generateContent + x-goog-api-key header.
 * Key must never appear in the request URL (proxy/access-log leak).
 */

"use strict";

const { postJson, extractAssistantText, classifyHttpError } = require("./shared.cjs");

/**
 * @param {object} config
 * @param {string|null} [config.apiKey]
 * @param {string} [config.model]
 */
function createGeminiFreeAdapter(config = {}) {
  const apiKey = config.apiKey ? String(config.apiKey) : null;
  const model = String(config.model || "gemini-flash-lite-latest");

  return Object.freeze({
    provider_id: "gemini_free",
    async chat(input = {}) {
      if (!apiKey) {
        return Object.freeze({
          degraded: true,
          provider_id: "gemini_free",
          provider_effective: "none",
          text: "",
          finish_reason: "degraded",
          reason: "missing_api_key",
        });
      }

      const messages = Array.isArray(input.messages) ? input.messages : [];
      const systemTexts = [];
      const contents = [];
      for (const m of messages) {
        const text = String(m?.content || "");
        if (m?.role === "system") {
          if (text) systemTexts.push(text);
          continue;
        }
        contents.push({
          role: m?.role === "assistant" ? "model" : "user",
          parts: [{ text }],
        });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const body = {
        contents,
        generationConfig: {
          maxOutputTokens: Number(input.maxTokens) || 512,
          temperature:
            input.temperature != null ? Number(input.temperature) : 0.3,
        },
      };
      if (systemTexts.length) {
        body.systemInstruction = {
          parts: [{ text: systemTexts.join("\n") }],
        };
      }

      const res = await postJson({
        url,
        headers: { "x-goog-api-key": apiKey },
        body,
      });

      if (!res.ok) {
        const kind = classifyHttpError(res.status, res.json);
        return Object.freeze({
          degraded: kind === "quota" || kind === "server",
          provider_id: "gemini_free",
          provider_effective:
            kind === "quota" || kind === "server" ? "none" : "gemini_free",
          text: "",
          finish_reason: kind === "quota" ? "quota" : "error",
          http_status: res.status,
          error_kind: kind,
        });
      }

      const parts = res.json?.candidates?.[0]?.content?.parts || [];
      const text = extractAssistantText(
        parts.map((p) => p?.text || "").join(""),
      );

      return Object.freeze({
        degraded: false,
        provider_id: "gemini_free",
        provider_effective: "gemini_free",
        text,
        finish_reason: "stop",
      });
    },
  });
}

module.exports = { createGeminiFreeAdapter };
