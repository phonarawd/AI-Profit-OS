/**
 * POST /api/v1/me/peotteok/chat — SSE partial stream
 * GET  /api/v1/me/peotteok/chips
 */

import {
  createPeotteokSseState,
  feedPeotteokSse,
  finishPeotteokSse,
  type PeotteokSseHandlers,
} from "./sse-consume";
import type { PeotteokChipsResponse } from "./types";

export type PeotteokChatStreamHandlers = PeotteokSseHandlers;

function apiUrl(apiBase: string, path: string): string {
  const base = (apiBase || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function fetchPeotteokChips(opts: {
  apiBase?: string;
  getAccessToken: () => string | null | Promise<string | null>;
}): Promise<PeotteokChipsResponse> {
  const token = await opts.getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    apiUrl(opts.apiBase ?? "", "/api/v1/me/peotteok/chips"),
    { headers, credentials: "include" },
  );
  if (!res.ok) {
    throw new Error(`peotteok_chips_${res.status}`);
  }
  return (await res.json()) as PeotteokChipsResponse;
}

/**
 * Streams SSE events from coach chat. Returns abort function.
 */
export function streamPeotteokChat(opts: {
  text: string;
  apiBase?: string;
  getAccessToken: () => string | null | Promise<string | null>;
  signal?: AbortSignal;
  /** Engine §47.16.2 — omit to start a new conversation */
  conversationId?: string;
} & PeotteokChatStreamHandlers): () => void {
  const ac = new AbortController();
  const signal = opts.signal ?? ac.signal;

  void (async () => {
    try {
      const token = await opts.getAccessToken();
      const headers: Record<string, string> = {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(
        apiUrl(opts.apiBase ?? "", "/api/v1/me/peotteok/chat"),
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            text: opts.text,
            stream: true,
            conversationId: opts.conversationId,
          }),
          signal,
        },
      );

      if (!res.ok || !res.body) {
        throw new Error(`peotteok_chat_${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const sse = createPeotteokSseState();
      const handlers: PeotteokSseHandlers = {
        onMeta: opts.onMeta,
        onChunk: opts.onChunk,
        onDone: opts.onDone,
        onError: opts.onError,
        onAbort: opts.onAbort,
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          feedPeotteokSse(sse, decoder.decode(), handlers);
          finishPeotteokSse(sse, handlers, signal.aborted ? "abort" : "eof");
          break;
        }
        feedPeotteokSse(sse, decoder.decode(value, { stream: true }), handlers);
        if (sse.terminated) break;
      }
    } catch (e) {
      if (signal.aborted) {
        opts.onAbort?.();
        return;
      }
      opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return () => ac.abort();
}
