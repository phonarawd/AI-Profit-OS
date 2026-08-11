/**
 * 퍼뜩 coach prompt builder — Engine §47.15
 * P = Fact JSON embed + sentence · G = tools=[] · S = refuse (no LLM)
 */

"use strict";

const { referencePromptBlock } = require("./reference-resolver.cjs");

const SYSTEM_BASE = [
  "당신은 퍼뜩입니다. 앱 이름은 퍼뜩입니다.",
  "타프로젝트 코치명·ChatGPT·클라이 등 다른 AI 이름을 쓰지 마세요.",
  "플랫폼 잔액·수익·기회 숫자는 제공된 Fact JSON만 사용하세요. 추정·창작 금지.",
  "출금·지급·한도·서킷을 실행하거나 완료했다고 말하지 마세요.",
  "원금 보장·확정 수익·모든 질문 오류0 마케팅 금지.",
  "성별을 추론하거나 성별 맞춤 멘트를 하지 마세요.",
  "IT/개발 용어(API, Staging, NATS 등)를 유저 답에 쓰지 마세요.",
].join(" ");

/**
 * @param {object} input
 * @param {"P"|"G"|"S"} input.lane
 * @param {string} input.userText
 * @param {object|null} [input.twin]
 * @param {object[]} [input.facts]
 * @param {object[]} [input.memories]
 * @param {object[]} [input.helpChunks]
 * @param {{role:string, content:string}[]} [input.history] — bounded prior
 *   turns of THIS conversation (Engine §47.16.2 working-state, session-scoped
 *   only). Caller is responsible for bounding; this function does not grow it.
 * @param {object|null} [input.referenceResolution] — deterministic resolver
 *   output. Only `resolved` is injected as REFERENCE_JSON; unresolved statuses
 *   are REFERENCE_STATUS and must never be treated as Fact.
 * @param {string|null} [input.referencePromptLine] — prebuilt line from
 *   referencePromptBlock (optional override).
 */
function buildCoachMessages(input = {}) {
  const lane = String(input.lane || "G");
  const userText = String(input.userText || "").trim();
  const twin = input.twin && typeof input.twin === "object" ? input.twin : null;
  const toneBand = twin?.toneBand || twin?.tone_band || "mid";
  const facts = Array.isArray(input.facts) ? input.facts : [];
  const memories = Array.isArray(input.memories) ? input.memories : [];
  const help = Array.isArray(input.helpChunks) ? input.helpChunks : [];
  const history = Array.isArray(input.history) ? input.history : [];

  const systemParts = [SYSTEM_BASE];
  if (lane === "P") {
    systemParts.push(
      "레인=P(플랫폼 Fact). Fact JSON 밖 숫자를 만들지 마세요. 문장화만 하세요.",
    );
    systemParts.push(`toneBand=${toneBand}`);
    systemParts.push(`FACTS_JSON=${JSON.stringify(facts.map(compactFact))}`);
    if (help.length) {
      systemParts.push(
        `HELP_SNIPPETS=${JSON.stringify(help.map((h) => h.text || h).slice(0, 3))}`,
      );
    }
  } else if (lane === "G") {
    systemParts.push(
      "레인=G(일상). 플랫폼 잔액·예상수익·호가를 추정하지 마세요. 그런 질문이면 플랫폼 Fact로 안내하라고만 하세요.",
    );
    systemParts.push("tools=[] 강제.");
  } else {
    systemParts.push("레인=S. LLM 호출 금지. 거절 템플릿만.");
  }

  const refLine =
    typeof input.referencePromptLine === "string" && input.referencePromptLine
      ? input.referencePromptLine
      : null;
  if (refLine) {
    systemParts.push(refLine);
    if (refLine.startsWith("REFERENCE_STATUS=")) {
      systemParts.push(
        "참조가 모호하거나 없으면 추측하지 말고 어떤 항목인지 짧게 다시 물어보세요.",
      );
    }
  } else if (input.referenceResolution && input.referenceResolution.status) {
    const block = referencePromptBlock(input.referenceResolution);
    if (block) {
      systemParts.push(block.line);
      if (block.kind === "unresolved") {
        systemParts.push(
          "참조가 모호하거나 없으면 추측하지 말고 어떤 항목인지 짧게 다시 물어보세요.",
        );
      }
    }
  }

  if (memories.length) {
    const memPreview = memories
      .slice(0, 5)
      .map((m) => String(m.content || "").slice(0, 120));
    systemParts.push(`RECENT_MEMORY=${JSON.stringify(memPreview)}`);
  }

  const historyMessages = history.map((h) =>
    Object.freeze({
      role: h?.role === "assistant" ? "assistant" : "user",
      content: String(h?.content || ""),
    }),
  );

  return Object.freeze([
    Object.freeze({ role: "system", content: systemParts.join("\n") }),
    ...historyMessages,
    Object.freeze({ role: "user", content: userText }),
  ]);
}

function compactFact(f) {
  if (!f || typeof f !== "object") return {};
  return {
    source: f.source,
    expires_at: f.expires_at || f.expiresAt,
    confidence: f.confidence,
    payload: f.payload || {},
  };
}

/**
 * Whether this lane/path should call LLMAdapter
 * @param {"P"|"G"|"S"} lane
 * @param {string} answerPath
 * @param {boolean} [degraded]
 */
function shouldCallLlm(lane, answerPath, degraded = false) {
  if (degraded) return false;
  if (lane === "S") return false;
  if (lane === "G") return true;
  if (lane === "P") {
    return answerPath === "llm_p" || answerPath === "rag";
  }
  return false;
}

module.exports = {
  SYSTEM_BASE,
  buildCoachMessages,
  shouldCallLlm,
};
