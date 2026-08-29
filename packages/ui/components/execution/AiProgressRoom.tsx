"use client";

import { useEffect, useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { Badge } from "../../primitives/Badge";
import { MarketPartnerLeg } from "../trust/MarketPartnerLeg";
import type { ExecutionUiState } from "./execution-types";
import { ProductThumb } from "./ProductThumb";
import { ExecutionStepList } from "./ExecutionStepList";

export type AiProgressRoomAsset = {
  assetImageUrl?: string | null;
  assetImageAltKo?: string;
  category?: string;
  assetImageSource?: string | null;
  assetIcon?: string | null;
};

export type AiProgressRoomProps = {
  state: ExecutionUiState;
  asset?: AiProgressRoomAsset;
  aiConfidenceScore?: number | null;
  matchWaitersCount?: number | null;
  matchableOpportunityCount?: number | null;
  /** Engine §4.2b — 없으면 대기 Fact 슬롯 숨김 */
  waitingFactSource?: "engine" | "admin" | null;
  buyPartnerId?: string;
  sellPartnerId?: string;
  buyLabel?: string;
  sellLabel?: string;
  /** Soft 중반 slaAlmost 기준시각 (ms) · 기본=마운트 시각 */
  startedAtMs?: number;
  onCancel?: () => void;
  className?: string;
};

function formatLogTime(d = new Date()): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/**
 * §48.3 AI 진행실 — running | requeue
 * Soft/Hard 카피3줄 · ProductThumb · ExecutionStepList · 긴장감 Fact
 */
export function AiProgressRoom({
  state,
  asset,
  aiConfidenceScore,
  matchWaitersCount,
  matchableOpportunityCount,
  waitingFactSource = null,
  buyPartnerId,
  sellPartnerId,
  buyLabel,
  sellLabel,
  startedAtMs,
  onCancel,
  className = "",
}: AiProgressRoomProps) {
  const [mountedAt] = useState(() => Date.now());
  const t0 = startedAtMs ?? mountedAt;
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - t0) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [t0]);

  const isRequeue = state.status === "requeue";
  const showSlaAlmost = elapsedSec >= 45 && elapsedSec <= 55;
  const showWaitingFact =
    waitingFactSource === "engine" || waitingFactSource === "admin";

  const progressPct = Math.max(
    0,
    Math.min(100, Number.isFinite(state.progressPct) ? state.progressPct : 0),
  );

  const logText = useMemo(() => {
    const msg =
      state.logLine?.trim() ||
      T.execution.steps[state.stepIndex]?.active ||
      "";
    return T.execution.logLine
      .replace("{time}", formatLogTime())
      .replace("{message}", msg);
  }, [state.logLine, state.stepIndex]);

  const thumbSrc = asset?.assetImageUrl ?? state.asset.iconUrl ?? null;
  const thumbAlt =
    asset?.assetImageAltKo?.trim() || state.asset.label || state.asset.ref || "";
  const category = asset?.category || "watch";
  const showQuoteLeg = state.stepIndex === 1;

  const confidence =
    typeof aiConfidenceScore === "number" &&
    Number.isFinite(aiConfidenceScore)
      ? Math.round(aiConfidenceScore)
      : null;

  return (
    <section
      data-testid="ai-progress-room"
      data-canon="execution-running"
      data-execution-status={state.status}
      data-result-code={state.resultCode ?? ""}
      className={`space-y-4 text-pd-text ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <ProductThumb
          src={thumbSrc}
          alt={thumbAlt}
          category={category}
          imageSource={asset?.assetImageSource}
          assetIcon={asset?.assetIcon}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium" data-field="assetLabel">
            {state.asset.label}
          </p>
          {state.asset.ref ? (
            <p className="truncate text-xs text-pd-text-muted">{state.asset.ref}</p>
          ) : null}
          <Badge tone="muted" data-block="noBidBadge">
            {T.execution.badgeNoBid}
          </Badge>
          <p className="text-xs text-pd-text-muted" data-block="imageRights">
            {T.execution.imageRightsNote}
          </p>
        </div>
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold" data-block="title">
          {T.execution.progressTitle}
        </h1>
        <p className="text-sm text-pd-text-muted" data-block="handsFree">
          · {T.execution.progressHandsFree}
        </p>
        <p className="text-sm text-pd-text-muted" data-block="executionModeHint">
          {T.execution.executionModeHint}
        </p>
      </header>

      {showWaitingFact && matchWaitersCount != null ? (
        <p className="text-xs text-pd-text-muted" data-block="progressWaiters">
          {T.execution.progressWaiters.replace(
            "{n}",
            String(matchWaitersCount),
          )}
        </p>
      ) : null}
      {showWaitingFact && matchableOpportunityCount != null ? (
        <p
          className="text-xs text-pd-text-muted"
          data-block="progressMatchable"
        >
          {T.execution.progressMatchable.replace(
            "{n}",
            String(matchableOpportunityCount),
          )}
        </p>
      ) : null}

      <p className="text-sm text-pd-accent" data-block="slaSoftHint">
        {T.execution.slaSoftHint}
      </p>

      {isRequeue ? (
        <p className="text-sm font-medium text-pd-warning" data-block="requeueHint">
          {T.execution.requeueHint}
        </p>
      ) : null}

      {showSlaAlmost ? (
        <p className="text-sm text-pd-accent" data-block="slaAlmost">
          {T.execution.slaAlmost}
        </p>
      ) : null}

      {confidence != null ? (
        <p className="text-sm" data-block="aiConfidence" data-field="aiConfidenceScore">
          {T.opportunity.labelAiConfidence} {confidence}%
        </p>
      ) : null}

      <div
        data-block="tensionBeats"
        data-tension="fact"
        className="h-2 overflow-hidden rounded-full bg-pd-border"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-pd-accent transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {showQuoteLeg ? (
        <div data-block="partnerLeg">
          <MarketPartnerLeg
            buyPartnerId={buyPartnerId}
            sellPartnerId={sellPartnerId}
            buyLabel={buyLabel}
            sellLabel={sellLabel}
          />
          <p className="mt-1 text-xs text-pd-text-muted">
            {T.trust.partners.legCaption
              .replace("{buyLabel}", buyLabel || "")
              .replace("{sellLabel}", sellLabel || "")}
          </p>
        </div>
      ) : null}

      <ExecutionStepList stepIndex={state.stepIndex} />

      <p
        className="font-mono text-xs text-pd-text-muted"
        data-block="log"
        data-testid="execution-log-line"
      >
        {logText}
      </p>

      <button
        type="button"
        data-block="cancel"
        data-testid="execution-cancel"
        className="w-full rounded-pd-md border border-pd-border px-4 py-3 text-sm text-pd-text"
        onClick={onCancel}
      >
        {T.execution.cancel}
      </button>
    </section>
  );
}
