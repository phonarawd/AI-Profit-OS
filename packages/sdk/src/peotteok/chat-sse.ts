/**
 * POST /api/v1/me/peotteok/chat — SSE partial stream
 * GET  /api/v1/me/peotteok/chips
 */

import type {
  PeotteokChatDone,
  PeotteokChatMeta,
  PeotteokChipsResponse,
} from "./types";

export type PeotteokChatStreamHandlers = {
  onMeta?: (meta: PeotteokChatMeta) => void;
  onChunk?: (text: string) => void;
  onDone?: (done: PeotteokChatDone) => void;
  onError?: (err: Error) => void;
};

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
    { headers },
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
          body: JSON.stringify({ text: opts.text, stream: true }),
          signal,
        },
      );

      if (!res.ok || !res.body) {
        throw new Error(`peotteok_chat_${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === "meta") {
            opts.onMeta?.(parsed as PeotteokChatMeta);
          } else if (event === "chunk") {
            const t = (parsed as { text?: string }).text ?? "";
            if (t) opts.onChunk?.(t);
          } else if (event === "done") {
            opts.onDone?.(parsed as PeotteokChatDone);
          } else if (event === "error") {
            const message =
              (parsed as { message?: string }).message || "peotteok_error";
            opts.onError?.(new Error(message));
          }
        }
      }
    } catch (e) {
      if (signal.aborted) return;
      opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return () => ac.abort();
}
