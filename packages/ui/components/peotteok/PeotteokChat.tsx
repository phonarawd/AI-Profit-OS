"use client";

import { useEffect, useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { useOptionalToast } from "../toast";

export type PeotteokUiLane = "P" | "G" | "S";
export type PeotteokUiToneBand = "young" | "mid" | "senior";

export type PeotteokUiChip = {
  id: string;
  labelKey: string;
  prompt: string;
  deepLink?: string;
};

export type PeotteokUiMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  lane?: PeotteokUiLane;
  deepLink?: string | null;
  degraded?: boolean;
  streaming?: boolean;
};

export type PeotteokChatProps = {
  messages?: PeotteokUiMessage[];
  chips?: PeotteokUiChip[];
  toneBand?: PeotteokUiToneBand | null;
  busy?: boolean;
  degradedToast?: boolean;
  fontScale?: "md" | "lg" | "xl";
  onSend?: (text: string) => void;
  className?: string;
};

export const PEOTTEOK_FALLBACK_CHIPS: PeotteokUiChip[] = [
  {
    id: "balance",
    labelKey: "T.peotteok.chipBalance",
    prompt: "지금 출금 가능한 수익이 얼마예요?",
  },
  {
    id: "deposit",
    labelKey: "T.peotteok.chipDeposit",
    prompt: "충전하면 미션을 시작할 수 있나요?",
  },
  {
    id: "opportunity",
    labelKey: "T.peotteok.chipOpportunity",
    prompt: "지금 참여할 수 있는 미션 알려줘",
  },
  {
    id: "benefits",
    labelKey: "T.peotteok.chipBenefits",
    prompt: "받을 수 있는 혜택 요약해줘",
    deepLink: "/me/benefits",
  },
  {
    id: "usdt",
    labelKey: "T.peotteok.chipUsdt",
    prompt: "테더 준비 안내 열어줄래?",
  },
];

function chipLabel(labelKey: string): string {
  const map: Record<string, string> = {
    "T.peotteok.chipBalance": T.peotteok.chipBalance,
    "T.peotteok.chipDeposit": T.peotteok.chipDeposit,
    "T.peotteok.chipOpportunity": T.peotteok.chipOpportunity,
    "T.peotteok.chipBenefits": T.peotteok.chipBenefits,
    "T.peotteok.chipInvite": T.peotteok.chipInvite,
    "T.peotteok.chipKyc": T.peotteok.chipKyc,
    "T.peotteok.chipUsdt": T.peotteok.chipUsdt,
  };
  return map[labelKey] ?? labelKey.replace(/^T\.peotteok\./, "");
}

function paceLine(band: PeotteokUiToneBand | null | undefined): string {
  if (band === "young") return T.peotteok.voice.youngPace;
  if (band === "senior") return T.peotteok.voice.seniorPace;
  return T.peotteok.voice.midPace;
}

/**
 * §6.4e / §27.10 — 퍼뜩 채팅 Canon peotteok-chat (표시 Owns)
 * SSE 훅은 apps/web 페이지에서 주입 · UI→sdk 의존 0
 */
export function PeotteokChat({
  messages = [],
  chips,
  toneBand = "mid",
  busy = false,
  degradedToast = false,
  fontScale = "md",
  onSend,
  className = "",
}: PeotteokChatProps) {
  const toast = useOptionalToast();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (degradedToast) {
      toast?.showToast({ code: "PEOTTEOK_LLM_BUSY" });
    }
  }, [degradedToast, toast]);

  const showGreeting = messages.length === 0;

  const displayChips = useMemo(
    () => (chips?.length ? chips : PEOTTEOK_FALLBACK_CHIPS).slice(0, 5),
    [chips],
  );

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setDraft("");
    onSend?.(t);
  };

  return (
    <section
      data-testid="peotteok-chat"
      data-canon="peotteok-chat"
      data-font-scale={fontScale}
      data-tone-band={toneBand ?? "mid"}
      className={`mx-auto flex max-w-lg flex-col gap-4 text-lux-text ${className}`.trim()}
    >
      <div data-block="brand">
        <BrandMark size="compact" />
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold" data-block="title">
          {T.peotteok.chatTitle}
        </h1>
        <p
          className="text-xs text-lux-text-muted"
          data-block="disclaimer"
          data-emoji-cap="0"
        >
          {T.peotteok.laneDisclaimer}
        </p>
        <p
          className="text-xs text-lux-text-muted"
          data-voice-pace={toneBand ?? "mid"}
        >
          {paceLine(toneBand)}
        </p>
      </header>

      <div
        data-block="log"
        data-testid="peotteok-log"
        className="min-h-[220px] space-y-3 rounded-lux-md border border-lux-border bg-lux-elevated/40 p-3"
        aria-label={T.peotteok.log}
      >
        {showGreeting ? (
          <p
            className="text-sm"
            data-testid="peotteok-greeting"
            data-voice="greeting"
          >
            {T.peotteok.voice.greeting}
          </p>
        ) : null}

        {messages.map((m) => (
          <div
            key={m.id}
            data-role={m.role}
            data-lane={m.lane ?? ""}
            data-degraded={m.degraded ? "1" : "0"}
            className={[
              "rounded-lux-md px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-8 bg-lux-accent/15"
                : "mr-4 bg-lux-bg/60",
            ].join(" ")}
          >
            <p className="whitespace-pre-wrap">
              {m.degraded && !m.text
                ? T.peotteok.llmBusy
                : m.text ||
                  (m.streaming ? T.peotteok.voice.shortConfirm : "")}
            </p>
            {m.lane === "S" && m.deepLink ? (
              <a
                href={m.deepLink}
                data-testid="peotteok-s-deeplink"
                data-action="withdraw-ui"
                className="mt-2 inline-block text-sm font-medium text-lux-accent underline"
              >
                {T.peotteok.voice.refuseS}
              </a>
            ) : null}
            {m.degraded && m.text ? (
              <p
                className="mt-1 text-xs text-lux-warning"
                data-degrade="busy"
                data-copy="T.peotteok.llmBusy"
              >
                {T.peotteok.llmBusy}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div data-block="chips" data-lane="P" className="flex flex-wrap gap-2">
        <span className="sr-only">{T.peotteok.factChips}</span>
        {displayChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            data-testid={`peotteok-chip-${chip.id}`}
            data-chip-id={chip.id}
            data-lane="P"
            disabled={busy}
            className="rounded-lux-md border border-lux-border px-3 py-1.5 text-xs text-lux-text disabled:opacity-50"
            onClick={() => submit(chip.prompt)}
          >
            {chipLabel(chip.labelKey)}
          </button>
        ))}
      </div>

      <form
        data-block="input"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={T.peotteok.placeholder}
          disabled={busy}
          data-testid="peotteok-input"
          className="min-w-0 flex-1 rounded-lux-md border border-lux-border bg-lux-bg px-3 py-2 text-sm text-lux-text placeholder:text-lux-text-muted"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          data-testid="peotteok-send"
          className="rounded-lux-md bg-lux-accent px-4 py-2 text-sm font-semibold text-lux-bg disabled:opacity-50"
        >
          {T.peotteok.send}
        </button>
      </form>

      <p className="sr-only" data-forbidden="withdraw_execute_cta">
        no execute
      </p>
    </section>
  );
}
