"use client";

import type { ReactNode } from "react";
import type {
  ExecutionTransportKind,
  TradeExecutionState,
} from "@aipo/sdk/execution-stream";
import "./spark-dash-execution.css";

export type ExecutionLogEntry = {
  id: string;
  line: string;
  /** Client observation time for this line; not presented as a server event timestamp. */
  observedAt?: string | null;
};

export type SparkDashExecutionSummary = {
  marketplaceLabel?: string;
  title?: string;
  subtitle?: string;
  productVisual?: ReactNode;
  requiredDeposit?: ReactNode;
  expectedProfit?: ReactNode;
  settledProfit?: ReactNode;
  profitRate?: ReactNode;
};

type Props = {
  state: TradeExecutionState | null;
  transport: ExecutionTransportKind;
  live?: boolean;
  logs?: ExecutionLogEntry[];
  summary?: SparkDashExecutionSummary;
  errorMessage?: string | null;
  actionBusy?: "safe-stop" | "refresh" | null;
  onSafeStop?: () => void;
  onRefresh?: () => void;
};

const STAGE_COPY = ["접수 확인", "맞추는 중", "결과 확인", "정산 준비", "정산 확인"] as const;

function clampProgress(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}

function isSettled(state: TradeExecutionState | null) {
  return state?.status === "success" && typeof state.settledProfitUsdt === "string";
}

function isStopped(state: TradeExecutionState | null) {
  return state?.status === "safe_stop" || state?.status === "cancelled" || state?.status === "failed";
}

function statusCopy(state: TradeExecutionState | null) {
  if (!state) return { label: "연결 중", tone: "muted" as const };
  if (isSettled(state)) return { label: "정산 완료", tone: "success" as const };
  switch (state.status) {
    case "running":
      return { label: "맞추는 중", tone: "active" as const };
    case "requeue":
      return { label: "다시 맞추는 중", tone: "active" as const };
    case "success":
      return { label: "결과 확인 중", tone: "active" as const };
    case "safe_stop":
      return { label: "안전 중지", tone: "danger" as const };
    case "cancelled":
      return { label: "진행 취소", tone: "danger" as const };
    case "failed":
      return { label: "처리 중단", tone: "danger" as const };
  }
}

function connectionCopy(transport: ExecutionTransportKind, live?: boolean) {
  if (transport === "sse" && live) return "실시간 연결됨";
  if (transport === "sse") return "연결 복구 중";
  return live ? "자동 갱신 중" : "상태 확인 중";
}

function formatTime(timestamp?: string | null) {
  if (!timestamp) return "--:--:--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function StageRail({ state }: { state: TradeExecutionState | null }) {
  const activeIndex = Math.min(4, Math.max(0, state?.stepIndex ?? 0));
  const finished = isSettled(state);
  const stopped = isStopped(state);

  return (
    <ol className="sdx-stage-list" aria-label="거래 진행 단계">
      {STAGE_COPY.map((label, index) => {
        // Visual completion is derived only from server-authored stepIndex/status.
        const complete = finished || index < activeIndex;
        const active = !finished && !stopped && index === activeIndex;
        const failed = stopped && index === activeIndex;
        return (
          <li
            key={label}
            className={`sdx-stage ${complete ? "is-complete" : ""} ${active ? "is-active" : ""} ${failed ? "is-failed" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="sdx-stage-node" aria-hidden="true">
              {complete ? "✓" : failed ? "!" : index + 1}
            </span>
            <span className="sdx-stage-copy">
              <strong>{label}</strong>
              <small>
                {complete
                  ? "완료"
                  : active
                    ? "지금 진행 중"
                    : failed
                      ? "여기서 멈췄어요"
                      : "대기 중"}
              </small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Metric({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="sdx-metric">
      <span>{label}</span>
      <div className="sdx-metric-value">{value ?? <span className="sdx-empty">—</span>}</div>
    </div>
  );
}

export function SparkDashExecutionExperience({
  state,
  transport,
  live = false,
  logs = [],
  summary,
  errorMessage,
  actionBusy = null,
  onSafeStop,
  onRefresh,
}: Props) {
  const progress = clampProgress(state?.progressPct);
  const status = statusCopy(state);
  const settled = isSettled(state);
  const stopped = isStopped(state);
  const running = state?.status === "running" || state?.status === "requeue" || state?.status === "success";
  const currentLine = state?.logLine?.trim() || "거래 실행 상태를 확인하고 있어요.";
  const visibleLogs = logs.length ? logs.slice(-24) : [{ id: "current", line: currentLine, observedAt: null }];
  const connection = connectionCopy(transport, live);

  return (
    <main
      className="sdx-shell"
      data-testid="spark-dash-execution"
      data-state={settled ? "success" : stopped ? "stopped" : running ? "running" : "connecting"}
      data-execution-transport={transport}
      data-live={live ? "true" : "false"}
    >
      <div className="sdx-ambient sdx-ambient-one" aria-hidden="true" />
      <div className="sdx-ambient sdx-ambient-two" aria-hidden="true" />

      <header className="sdx-header">
        <div>
          <p className="sdx-eyebrow">PUTDUK · 거래 실행</p>
          <h1>거래가 어떻게 진행되는지 한눈에 확인하세요</h1>
          <p className="sdx-header-desc">서버가 보내는 실제 진행 상태를 기준으로 자동 업데이트됩니다.</p>
        </div>
        <div className="sdx-header-status" aria-live="polite">
          <span className={`sdx-status-dot is-${status.tone}`} aria-hidden="true" />
          <div>
            <strong>{status.label}</strong>
            <small>{connection}</small>
          </div>
        </div>
      </header>

      <section className="sdx-product-card" aria-label="거래 상품 요약">
        <div className="sdx-product-visual" aria-hidden={summary?.productVisual ? undefined : true}>
          {summary?.productVisual ?? (
            <div className="sdx-product-placeholder">
              <span>PUTDUK</span>
              <b>LIVE TRADE</b>
            </div>
          )}
        </div>
        <div className="sdx-product-copy">
          <div className="sdx-market-row">
            <span className="sdx-market-badge">{summary?.marketplaceLabel ?? "PUTDUK"}</span>
            <span className="sdx-live-pill">
              <i aria-hidden="true" /> {connection}
            </span>
          </div>
          <h2>{summary?.title ?? state?.asset.label ?? "거래 실행 중"}</h2>
          <p>{summary?.subtitle ?? "조건을 안전하게 확인하면서 가장 좋은 결과를 찾고 있어요."}</p>
        </div>
        <div className="sdx-metrics">
          <Metric label="필요 입금" value={summary?.requiredDeposit} />
          <Metric label={settled ? "확정 수익" : "예상 수익"} value={settled ? summary?.settledProfit ?? summary?.expectedProfit : summary?.expectedProfit} />
          <Metric label="수익률" value={summary?.profitRate} />
        </div>
      </section>

      <section className="sdx-progress-overview" aria-label="거래 진행률">
        <div className="sdx-progress-copy">
          <span>전체 진행률</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <div
          className="sdx-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="거래 전체 진행률"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>{currentLine}</p>
      </section>

      <div className="sdx-main-grid">
        <section className="sdx-panel sdx-stage-panel">
          <div className="sdx-panel-heading">
            <div>
              <span className="sdx-panel-kicker">실행 상태</span>
              <h2>지금 어디까지 왔나요?</h2>
            </div>
            <span className="sdx-step-count">{activeIndexLabel(state)}</span>
          </div>
          <StageRail state={state} />
        </section>

        <section className="sdx-panel sdx-log-panel" aria-label="실행 기록">
          <div className="sdx-panel-heading">
            <div>
              <span className="sdx-panel-kicker">실행 기록</span>
              <h2>방금 일어난 일</h2>
            </div>
            <span className="sdx-log-live"><i aria-hidden="true" /> {connection}</span>
          </div>
          <div className="sdx-log-stream" role="log" aria-live="polite" aria-relevant="additions text">
            {visibleLogs.map((entry, index) => (
              <div className={`sdx-log-line ${index === visibleLogs.length - 1 ? "is-latest" : ""}`} key={entry.id}>
                <time dateTime={entry.observedAt ?? undefined}>{formatTime(entry.observedAt)}</time>
                <span>{entry.line}</span>
              </div>
            ))}
          </div>
          <p className="sdx-observation-note">시간은 이 화면이 상태를 확인한 시각이에요.</p>
        </section>
      </div>

      {settled ? (
        <section className="sdx-result sdx-result-success" role="status">
          <div className="sdx-result-icon" aria-hidden="true">✓</div>
          <div>
            <span>거래 완료</span>
            <h2>정산 결과가 반영됐어요</h2>
            <p>{currentLine}</p>
          </div>
          <div className="sdx-result-money">{summary?.settledProfit ?? summary?.expectedProfit}</div>
        </section>
      ) : stopped ? (
        <section className="sdx-result sdx-result-danger" role="alert">
          <div className="sdx-result-icon" aria-hidden="true">!</div>
          <div>
            <span>{status.label}</span>
            <h2>{state?.status === "safe_stop" ? "원금을 지키기 위해 안전하게 멈췄어요" : "이번 진행은 여기서 멈췄어요"}</h2>
            <p>{currentLine}</p>
          </div>
        </section>
      ) : null}

      {errorMessage ? <div className="sdx-inline-error" role="alert">{errorMessage}</div> : null}

      <footer className="sdx-action-dock">
        <button
          type="button"
          className="sdx-button sdx-button-secondary"
          disabled={!onSafeStop || actionBusy !== null || settled || stopped}
          onClick={onSafeStop}
        >
          <span aria-hidden="true">◇</span>
          {actionBusy === "safe-stop" ? "안전하게 멈추는 중…" : "안전 중지"}
        </button>
        <button
          type="button"
          className="sdx-button sdx-button-primary"
          disabled={!onRefresh || actionBusy !== null}
          onClick={onRefresh}
        >
          <span aria-hidden="true">↻</span>
          {actionBusy === "refresh" ? "확인하는 중…" : "상태 새로 확인"}
        </button>
      </footer>
    </main>
  );
}

function activeIndexLabel(state: TradeExecutionState | null) {
  if (!state) return "준비 중";
  return `${state.stepIndex + 1} / 5 단계`;
}
