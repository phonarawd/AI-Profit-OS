"use client";

import {
  isTradeExecutionRequestError,
  useTradeExecution,
  type ExecutionTransportKind,
  type TradeExecutionState,
} from "@aipo/sdk/execution-stream";
import Link from "next/link";
import { useCallback, type ReactNode } from "react";
import styles from "./trade-execute.module.css";

const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;
const TITLE = "진행";

type ConsumerState =
  | "MatchingInProgress"
  | "MatchingRetrying"
  | "Settled"
  | "StoppedSafely"
  | "Cancelled"
  | "Failed";

function formatUsdtDisplay(raw: string | null | undefined): string | null {
  if (raw == null || raw === "" || !USDT_DEC.test(raw)) return null;
  const neg = raw.startsWith("-");
  const abs = neg ? raw.slice(1) : raw;
  const [w, f = ""] = abs.split(".");
  const whole = w.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = f.padEnd(2, "0").slice(0, 2);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

function usdtLine(raw: string | null | undefined): string {
  const body = formatUsdtDisplay(raw);
  return body ? `${body} USDT` : "—";
}

function sessionToken(): string | null {
  return null;
}

function isSettled(state: TradeExecutionState): boolean {
  return (
    state.status === "success" &&
    typeof state.settledProfitUsdt === "string" &&
    USDT_DEC.test(state.settledProfitUsdt)
  );
}

function consumerState(state: TradeExecutionState): ConsumerState | null {
  if (isSettled(state)) return "Settled";
  switch (state.status) {
    case "running":
      return "MatchingInProgress";
    case "requeue":
      return "MatchingRetrying";
    case "safe_stop":
      return "StoppedSafely";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return null;
  }
}

function meaningCopy(state: TradeExecutionState): string {
  const kind = consumerState(state);
  switch (kind) {
    case "MatchingInProgress":
      return "기회를 맞추는 중이에요.";
    case "MatchingRetrying":
      return "다시 맞추는 중이에요.";
    case "Settled":
      return "정산이 반영됐어요.";
    case "StoppedSafely":
      return "이번엔 맞지 않았어요. 원금은 그대로예요.";
    case "Cancelled":
      return "이 진행은 취소됐어요.";
    case "Failed":
      return "지금은 처리할 수 없어요.";
    default:
      return state.status === "success"
        ? "처리 중이에요."
        : "불러오는 중…";
  }
}

function Shell({
  transport,
  consumer,
  tradeStatus,
  live,
  children,
}: {
  transport: ExecutionTransportKind;
  consumer?: string;
  tradeStatus?: string;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={styles.page}
      data-execution-transport={transport}
      data-consumer-state={consumer}
      data-trade-status={tradeStatus}
      data-live={live ? "true" : "false"}
    >
      {children}
    </main>
  );
}

export function TradeExecuteClient({ tradeId }: { tradeId: string }) {
  const getAccessToken = useCallback(sessionToken, []);
  const { state, error, transport, live } = useTradeExecution({
    tradeId,
    apiBase: "",
    getAccessToken,
    enabled: tradeId.length > 0,
  });

  if (!tradeId) {
    return (
      <Shell transport={transport}>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>이 진행을 찾을 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/">홈으로</Link>
        </div>
      </Shell>
    );
  }

  if (isTradeExecutionRequestError(error) && error.code === "AUTH_REQUIRED") {
    return (
      <Shell transport={transport}>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>로그인하면 이 진행을 확인할 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/">
            홈으로
          </Link>
        </div>
      </Shell>
    );
  }

  if (isTradeExecutionRequestError(error) && error.code === "NOT_FOUND") {
    return (
      <Shell transport={transport}>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>이 진행을 찾을 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/">홈으로</Link>
          <Link className={styles.secondary} href="/profits">
            다른 기회 보기
          </Link>
        </div>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell transport={transport} live={live}>
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>불러오는 중…</p>
        {error ? (
          <p className={styles.err}>연결이 불안정해요. 다시 시도하고 있어요.</p>
        ) : null}
        <div className={styles.actions}>
          <Link className={styles.secondary} href="/">
            홈으로
          </Link>
        </div>
      </Shell>
    );
  }

  const kind = consumerState(state);
  const settled = isSettled(state);
  const label = state.asset?.label?.trim() || null;

  return (
    <Shell
      transport={transport}
      consumer={kind ?? undefined}
      tradeStatus={state.status}
      live={live}
    >
      <p className={styles.nav}>
        <Link href="/">홈</Link>
      </p>
      <h1 className={styles.title}>{TITLE}</h1>
      <p className={styles.lead}>{meaningCopy(state)}</p>
      {label ? <p className={styles.note}>{label}</p> : null}
      {settled ? (
        <dl className={styles.facts}>
          <div>
            <dt>정산 수익</dt>
            <dd>{usdtLine(state.settledProfitUsdt)}</dd>
          </div>
        </dl>
      ) : null}
      {kind === "MatchingInProgress" || kind === "MatchingRetrying" ? (
        <p className={styles.note}>결과가 나올 때까지 기다려 주세요.</p>
      ) : null}
      {kind === "Settled" ? (
        <p className={styles.note}>원금은 다시 쓸 수 있어요.</p>
      ) : null}
      {error && !isTradeExecutionRequestError(error) ? (
        <p className={styles.err}>연결이 불안정해요. 다시 시도하고 있어요.</p>
      ) : null}
      <div className={styles.actions}>
        {kind === "Settled" ? <Link href="/wallet">지갑 보기</Link> : null}
        {kind === "StoppedSafely" || kind === "Cancelled" ? (
          <Link href="/profits">다른 기회 보기</Link>
        ) : null}
        {kind === "Failed" ? <Link href="/me/support">고객지원</Link> : null}
        <Link className={styles.secondary} href="/">
          홈으로
        </Link>
      </div>
    </Shell>
  );
}
