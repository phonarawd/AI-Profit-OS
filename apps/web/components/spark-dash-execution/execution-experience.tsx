"use client";

import type { ReactNode } from "react";
import type {
  ExecutionConnectionMode,
  TradeExecutionState,
} from "@putduk/sdk/execution-stream";
import "./spark-dash-execution.css";

export type ExecutionLogEntry = {
  id: string;
  line: string;
  timestamp?: string | null;
};

export type SparkDashExecutionSummary = {
  marketplaceLabel?: string;
  title?: string;
  subtitle?: string;
  productVisual?: ReactNode;
  requiredDeposit?: ReactNode;
  expectedProfit?: ReactNode;
  profitRate?: ReactNode;
};

type Props = {
  state: TradeExecutionState | null;
  connectionMode: ExecutionConnectionMode;
  logs?: ExecutionLogEntry[];
  summary?: SparkDashExecutionSummary;
  errorMessage?: string | null;
  actionBusy?: "safe-stop" | "refresh" | null;
  onSafeStop?: () => void;
  onRefresh?: () => void;
};

const STOPPED_STATUSES = new Set(["CANCELED", "SAFE_STOPPED", "STOPPED"]);
const RUNNING_STATUSES = new Set([
  "RESERVED",
  "CLAIMED",
  "ORDER_PLACED",
  "SHIPMENT_TRACKING",
  "RESELL_LISTED",
]);

function clampProgress(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}

function statusCopy(status?: string) {
  switch (status) {
    case "SETTLED":
      return { label: "정산 완료", tone: "success" as const };
    case "CANCELED":
      return { label: "거래 취소", tone: "danger" as const };
    case "SAFE_STOPPED":
      return { label: "안전 중지", tone: "danger" as const };
    case "STOPPED":
      return { label: "거래 중지", tone: "danger" as const };
    case "RESERVED":
      return { label: "거래 접수", tone: "active" as const };
    case "CLAIMED":
      return { label: "진행 중", tone: "active" as const };
    case "ORDER_PLACED":
      return { label: "주문 진행", tone: "active" as const };
    case "SHIPMENT_TRACKING":
      return { label: "배송 확인", tone: "active" as const };
    case "RESELL_LISTED":
      return { label: "판매 준비", tone: "active" as const };
    default:
      return { label: "연결 중", tone: "muted" as const };
  }
}

function connectionCopy(mode: ExecutionConnectionMode) {
  switch (mode) {
    case "ws":
      return "라이브 연결됨";
    case "sse":
      return "실시간 연결됨";
    case "poll":
      return "자동 갱신 중";
    case "stopped":
      return "연결 종료";
    default:
      return "연결하는 중";
  }
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

function stageLabel(state: TradeExecutionState | null, index: number) {
  if (!state) return index === 0 ? "거래 준비" : `다음 단계 ${index + 1}`;
  if (index === state.stepIndex && state.stepLabel?.trim()) return state.stepLabel.trim();
  if (index < state.stepIndex) return `단계 ${index + 1} 완료`;
  return `다음 단계 ${index + 1}`;
}

function StageRail({ state }: { state: TradeExecutionState | null }) {
  const stepCount = Math.max(1, state?.stepCount ?? 5);
  const activeIndex = Math.min(stepCount - 1, Math.max(0, state?.stepIndex ?? 0));
  const finished = state?.status === "SETTLED";
  const stopped = state ? STOPPED_STATUSES.has(state.status) : false;

  return (
    <ol className="sdx-stage-list" aria-label="거래 진행 단계">
      {Array.from({ length: stepCount }, (_, index) => {
        const complete = finished || index < activeIndex;
        const active = !finished && !stopped && index === activeIndex;
        const failed = stopped && index === activeIndex;
        return (
          <li
            key={index}
            className={`sdx-stage ${complete ? "is-complete" : ""} ${active ? "is-active" : ""} ${failed ? "is-failed" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="sdx-stage-node" aria-hidden="true">
              {complete ? "✓" : failed ? "!" : index + 1}
            </span>
            <span className="sdx-stage-copy">
              <strong>{stageLabel(state, index)}</strong>
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
  connectionMode,
  logs = [],
  summary,
  errorMessage,
  actionBusy = null,
  onSafeStop,
  onRefresh,
}: Props) {
  const progress = clampProgress(state?.progressPct);
  const status = statusCopy(state?.status);
  const settled = state?.status === "SETTLED";
  const stopped = state ? STOPPED_STATUSES.has(state.status) : false;
  const running = state ? RUNNING_STATUSES.has(state.status) : false;
  const currentLine = state?.logLine?.trim() || "거래 실행 상태를 확인하고 있어요.";
  const visibleLogs = logs.length
    ? logs.slice(-24)
    : [{ id: "current", line: currentLine, timestamp: state?.timestamp }];

  return (
    <main className="sdx-shell" data-state={settled ? "success" : stopped ? "stopped" : running ? "running" : "connecting"}>
      <div className="sdx-ambient sdx-ambient-one" aria-hidden="true" />
      <div className="sdx-ambient sdx-ambient-two" aria-hidden="true" />

      <header className="sdx-header">
        <div>
          <p className="sdx-eyebrow">PUTDUK · 거래 실행</p>
          <h1>거래가 어떻게 진행되는지 한눈에 확인하세요</h1>
          <p className="sdx-header-desc">실제 서버 상태와 실행 기록을 기준으로 자동 업데이트됩니다.</p>
        </div>
        <div className="sdx-header-status" aria-live="polite">
          <span className={`sdx-status-dot is-${status.tone}`} aria-hidden="true" />
          <div>
            <strong>{status.label}</strong>
            <small>{connectionCopy(connectionMode)}</small>
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
            <span className="sdx-market-badge">{summary?.marketplaceLabel ?? "Marketplace"}</span>
            <span className="sdx-live-pill">
              <i aria-hidden="true" /> {connectionCopy(connectionMode)}
            </span>
          </div>
          <h2>{summary?.title ?? "거래 실행 중"}</h2>
          <p>{summary?.subtitle ?? "상품과 거래 조건을 안전하게 확인하며 진행하고 있어요."}</p>
        </div>
        <div className="sdx-metrics">
          <Metric label="필요 입금" value={summary?.requiredDeposit} />
          <Metric label="예상 수익" value={summary?.expectedProfit} />
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
            {state ? <time dateTime={state.timestamp}>{formatTime(state.timestamp)}</time> : null}
          </div>
          <StageRail state={state} />
        </section>

        <section className="sdx-panel sdx-log-panel" aria-label="라이브 실행 기록">
          <div className="sdx-panel-heading">
            <div>
              <span className="sdx-panel-kicker">실행 기록</span>
              <h2>방금 일어난 일</h2>
            </div>
            <span className="sdx-log-live"><i aria-hidden="true" /> 자동 업데이트</span>
          </div>
          <div className="sdx-log-stream" role="log" aria-live="polite" aria-relevant="additions text">
            {visibleLogs.map((entry, index) => (
              <div className={`sdx-log-line ${index === visibleLogs.length - 1 ? "is-latest" : ""}`} key={entry.id}>
                <time dateTime={entry.timestamp ?? undefined}>{formatTime(entry.timestamp)}</time>
                <span>{entry.line}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {settled ? (
        <section className="sdx-result sdx-result-success" role="status">
          <div className="sdx-result-icon" aria-hidden="true">✓</div>
          <div>
            <span>거래 완료</span>
            <h2>정산까지 안전하게 마쳤어요</h2>
            <p>{currentLine}</p>
          </div>
          <div className="sdx-result-money">{summary?.expectedProfit}</div>
        </section>
      ) : stopped ? (
        <section className="sdx-result sdx-result-danger" role="alert">
          <div className="sdx-result-icon" aria-hidden="true">!</div>
          <div>
            <span>{status.label}</span>
            <h2>이번 거래는 여기서 멈췄어요</h2>
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
