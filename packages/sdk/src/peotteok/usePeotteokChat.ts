"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPeotteokChips, streamPeotteokChat } from "./chat-sse";
import {
  deletePeotteokConversation,
  getPeotteokConversation,
  listPeotteokConversations,
} from "./history";
import type {
  PeotteokChatDone,
  PeotteokChip,
  PeotteokConversationSummary,
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
  conversations: PeotteokConversationSummary[];
  conversationId: string | null;
  chips: PeotteokChip[];
  toneBand: PeotteokToneBand | null;
  busy: boolean;
  lastLane: PeotteokLane | null;
  lastDone: PeotteokChatDone | null;
  error: Error | null;
  send: (text: string) => void;
  refreshChips: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  newConversation: () => void;
  openConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
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
  const [conversations, setConversations] = useState<PeotteokConversationSummary[]>(
    [],
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
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

  const refreshHistory = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await listPeotteokConversations({
        apiBase,
        getAccessToken: () => getTokenRef.current(),
      });
      setConversations(rows);
    } catch {
      /* list is additive; chat still works when table is not applied */
    }
  }, [apiBase, enabled]);

  useEffect(() => {
    void refreshChips();
    void refreshHistory();
    return () => {
      streamGenRef.current += 1;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [refreshChips, refreshHistory]);

  const newConversation = useCallback(() => {
    streamGenRef.current += 1;
    stopRef.current?.();
    stopRef.current = null;
    conversationIdRef.current = undefined;
    setConversationId(null);
    setMessages([]);
    setLastDone(null);
    setLastLane(null);
    setBusy(false);
    setError(null);
  }, []);

  const openConversation = useCallback(
    async (id: string) => {
      if (!enabled || !id) return;
      streamGenRef.current += 1;
      stopRef.current?.();
      stopRef.current = null;
      setBusy(true);
      try {
        const row = await getPeotteokConversation({
          apiBase,
          conversationId: id,
          getAccessToken: () => getTokenRef.current(),
        });
        conversationIdRef.current = row.conversation.id;
        setConversationId(row.conversation.id);
        setMessages(
          row.messages.map((m) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            lane:
              m.lane === "P" || m.lane === "G" || m.lane === "S"
                ? m.lane
                : undefined,
            deepLink: m.deepLink,
            citations: m.citations,
            streaming: false,
          })),
        );
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setBusy(false);
      }
    },
    [apiBase, enabled],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      if (!enabled || !id) return;
      try {
        await deletePeotteokConversation({
          apiBase,
          conversationId: id,
          getAccessToken: () => getTokenRef.current(),
        });
        if (conversationIdRef.current === id) {
          newConversation();
        }
        await refreshHistory();
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    [apiBase, enabled, newConversation, refreshHistory],
  );

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
            setConversationId(meta.conversation_id);
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
            setConversationId(done.conversation_id);
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
                    citations: done.citations,
                    degraded: Boolean(done.degraded),
                    streaming: false,
                  }
                : m,
            ),
          );
          setBusy(false);
          stopRef.current = null;
          void refreshHistory();
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
    [apiBase, busy, enabled, refreshHistory],
  );

  return {
    messages,
    conversations,
    conversationId,
    chips,
    toneBand,
    busy,
    lastLane,
    lastDone,
    error,
    send,
    refreshChips,
    refreshHistory,
    newConversation,
    openConversation,
    deleteConversation: removeConversation,
  };
}
