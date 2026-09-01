"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPeotteokChips, streamPeotteokChat } from "./chat-sse";
import type {
  PeotteokChatDone,
  PeotteokChip,
  PeotteokLane,
  PeotteokMessage,
  PeotteokToneBand,
} from "./types";

export type UsePeotteokChatOptions = {
  apiBase?: string;
  getAccessToken: () => string | null | Promise<string | null>;
  enabled?: boolean;
  /** Offline / preview chips when API idle */
  fallbackChips?: PeotteokChip[];
};

export type UsePeotteokChatResult = {
  messages: PeotteokMessage[];
  chips: PeotteokChip[];
  toneBand: PeotteokToneBand | null;
  busy: boolean;
  lastLane: PeotteokLane | null;
  lastDone: PeotteokChatDone | null;
  error: Error | null;
  send: (text: string) => void;
  refreshChips: () => Promise<void>;
};

let msgSeq = 0;
function nextId(prefix: string): string {
  msgSeq += 1;
  return `${prefix}-${msgSeq}`;
}

export function usePeotteokChat(
  opts: UsePeotteokChatOptions,
): UsePeotteokChatResult {
  const {
    apiBase = "",
    getAccessToken,
    enabled = true,
    fallbackChips = [],
  } = opts;

  const [messages, setMessages] = useState<PeotteokMessage[]>([]);
  const [chips, setChips] = useState<PeotteokChip[]>(fallbackChips);
  const [toneBand, setToneBand] = useState<PeotteokToneBand | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastLane, setLastLane] = useState<PeotteokLane | null>(null);
  const [lastDone, setLastDone] = useState<PeotteokChatDone | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const getTokenRef = useRef(getAccessToken);
  getTokenRef.current = getAccessToken;
  const stopRef = useRef<(() => void) | null>(null);
  const streamGenRef = useRef(0);
  /** Engine §47.16.2 — kept in a ref (not state) so mid-stream updates from
   * `onMeta` don't need a re-render, and the next `send()` always reads the
   * latest value even while a previous stream is still closing. */
  const conversationIdRef = useRef<string | undefined>(undefined);

  const refreshChips = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetchPeotteokChips({
        apiBase,
        getAccessToken: () => getTokenRef.current(),
      });
      if (Array.isArray(res.chips) && res.chips.length) {
        setChips(res.chips);
      }
      if (res.toneBand === "young" || res.toneBand === "mid" || res.toneBand === "senior") {
        setToneBand(res.toneBand);
      }
      setError(null);
    } catch (e) {
      if (fallbackChips.length) setChips(fallbackChips);
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, [apiBase, enabled, fallbackChips]);

  useEffect(() => {
    void refreshChips();
    return () => {
      streamGenRef.current += 1;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [refreshChips]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!enabled || !text || busy) return;

      stopRef.current?.();
      const gen = ++streamGenRef.current;
      setBusy(true);
      setError(null);
      setLastDone(null);

      const userId = nextId("u");
      const asstId = nextId("a");

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text },
        {
          id: asstId,
          role: "assistant",
          text: "",
          streaming: true,
        },
      ]);

      let lane: PeotteokLane | undefined;

      stopRef.current = streamPeotteokChat({
        text,
        apiBase,
        conversationId: conversationIdRef.current,
        getAccessToken: () => getTokenRef.current(),
        onMeta: (meta) => {
          if (meta.lane === "P" || meta.lane === "G" || meta.lane === "S") {
            lane = meta.lane;
            setLastLane(meta.lane);
          }
          if (meta.conversation_id) {
            conversationIdRef.current = meta.conversation_id;
          }
        },
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId
                ? { ...m, text: m.text + chunk, lane, streaming: true }
                : m,
            ),
          );
        },
        onDone: (done) => {
          if (gen !== streamGenRef.current) return;
          setLastDone(done);
          if (done.conversation_id) {
            conversationIdRef.current = done.conversation_id;
          }
          if (done.lane === "P" || done.lane === "G" || done.lane === "S") {
            setLastLane(done.lane);
            lane = done.lane;
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId
                ? {
                    ...m,
                    text: done.answer_text?.trim() || m.text,
                    lane,
                    deepLink: done.deep_link ?? null,
                    degraded: Boolean(done.degraded),
                    streaming: false,
                  }
                : m,
            ),
          );
          setBusy(false);
          stopRef.current = null;
        },
        onError: (err) => {
          if (gen !== streamGenRef.current) return;
          setError(err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId
                ? {
                    ...m,
                    text: m.text || "",
                    streaming: false,
                    degraded: true,
                  }
                : m,
            ),
          );
          setBusy(false);
          stopRef.current = null;
        },
        onAbort: () => {
          if (gen !== streamGenRef.current) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstId ? { ...m, streaming: false } : m,
            ),
          );
          setBusy(false);
          stopRef.current = null;
        },
      });
    },
    [apiBase, busy, enabled],
  );

  return {
    messages,
    chips,
    toneBand,
    busy,
    lastLane,
    lastDone,
    error,
    send,
    refreshChips,
  };
}
