/**
 * 상담/AI 가시 메시지 조회 계약 (S01–S05, I01–I07).
 * ai_logs.answer_preview ≠ 전체 대화. 원문 전체 수집 정책은 미활성화.
 */

"use strict";

function assertOwnedConversation(input) {
  const userId = String(input.userId || "");
  const ownerUserId = String(input.ownerUserId || "");
  if (!userId || userId !== ownerUserId) {
    return { ok: false, code: "CONVERSATION_NOT_OWNED", status: 404 };
  }
  return { ok: true, status: 200 };
}

function publicConversationView(row) {
  return {
    conversationId: row.conversationId,
    userId: row.userId,
    messages: (row.messages || []).map((m) => ({
      id: m.id,
      role: m.role === "assistant" || m.role === "user" ? m.role : "user",
      body: String(m.userVisibleBody || ""),
      at: m.at,
    })),
    systemPromptExcluded: true,
    hiddenReasoningExcluded: true,
    secretsExcluded: true,
    staffNotesExcluded: true,
  };
}

function rejectPreviewAsFullTranscript(input) {
  if (input.source === "ai_logs.answer_preview") {
    return {
      ok: false,
      code: "PREVIEW_NOT_TRANSCRIPT",
      fullConversation: false,
    };
  }
  return { ok: true };
}

function supportTicketTransition(input) {
  const allowed = {
    received: ["open", "blocked"],
    open: ["pending_user", "resolved", "blocked"],
    pending_user: ["open", "resolved"],
    resolved: ["open"],
    blocked: ["open"],
  };
  const next = String(input.nextStatus || "");
  const cur = String(input.status || "");
  if (!(allowed[cur] || []).includes(next)) {
    return { ok: false, code: "INVALID_TRANSITION" };
  }
  return { ok: true, status: next, memberVisibleReply: input.memberVisible === true };
}

module.exports = {
  assertOwnedConversation,
  publicConversationView,
  rejectPreviewAsFullTranscript,
  supportTicketTransition,
};
