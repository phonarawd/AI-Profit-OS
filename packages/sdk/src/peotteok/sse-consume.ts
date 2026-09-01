/**
 * 퍼뜩 SSE — 프로토콜 done 없는 EOF는 실패 종료. trailing은 완전 이벤트만 수용.
 */

import type { PeotteokChatDone, PeotteokChatMeta } from "./types";

export type PeotteokSseHandlers = {
  onMeta?: (meta: PeotteokChatMeta) => void;
  onChunk?: (text: string) => void;
  onDone?: (done: PeotteokChatDone) => void;
  onError?: (err: Error) => void;
  onAbort?: () => void;
};

export type PeotteokSseState = {
  buf: string;
  sawDone: boolean;
  sawError: boolean;
  terminated: boolean;
};

export function createPeotteokSseState(): PeotteokSseState {
  return { buf: "", sawDone: false, sawError: false, terminated: false };
}

function dispatchBlock(
  state: PeotteokSseState,
  part: string,
  handlers: PeotteokSseHandlers,
): boolean {
  const lines = part.split("\n");
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return true;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return false;
  }
  if (event === "meta") {
    handlers.onMeta?.(parsed as PeotteokChatMeta);
    return true;
  }
  if (event === "chunk") {
    const t = (parsed as { text?: string }).text ?? "";
    if (t) handlers.onChunk?.(t);
    return true;
  }
  if (event === "done") {
    state.sawDone = true;
    state.terminated = true;
    handlers.onDone?.(parsed as PeotteokChatDone);
    return true;
  }
  if (event === "error") {
    state.sawError = true;
    state.terminated = true;
    const message = (parsed as { message?: string }).message || "peotteok_error";
    handlers.onError?.(new Error(message));
    return true;
  }
  return false;
}

export function feedPeotteokSse(
  state: PeotteokSseState,
  text: string,
  handlers: PeotteokSseHandlers,
): void {
  if (state.terminated) return;
  state.buf += text;
  const parts = state.buf.split("\n\n");
  state.buf = parts.pop() ?? "";
  for (const part of parts) {
    if (!dispatchBlock(state, part, handlers)) {
      state.sawError = true;
      state.terminated = true;
      handlers.onError?.(new Error("peotteok_sse_malformed"));
      return;
    }
    if (state.terminated) return;
  }
}

export function finishPeotteokSse(
  state: PeotteokSseState,
  handlers: PeotteokSseHandlers,
  reason: "eof" | "abort",
): void {
  if (state.terminated) return;
  if (reason === "abort") {
    state.terminated = true;
    handlers.onAbort?.();
    return;
  }
  const rest = state.buf;
  state.buf = "";
  if (rest.trim()) {
    if (!dispatchBlock(state, rest, handlers)) {
      state.sawError = true;
      state.terminated = true;
      handlers.onError?.(new Error("peotteok_sse_malformed_trailing"));
      return;
    }
  }
  if (state.terminated) return;
  if (!state.sawDone) {
    state.sawError = true;
    state.terminated = true;
    handlers.onError?.(new Error("peotteok_sse_eof_without_done"));
    return;
  }
  state.terminated = true;
}
