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

const DESKTOP_NAV = [
  { key: "home", href: "/", label: "홈" },
  { key: "explore", href: "/profits", label: "기회 탐색" },
  { key: "assets", href: "/wallet", label: "내 자산" },
  { key: "participations", href: "/trades", label: "참여 내역" },
  { key: "settlements", href: "/wallet/history", label: "정산 내역" },
] as const;

const MOBILE_NAV = [
  { key: "home", href: "/", label: "홈" },
  { key: "explore", href: "/profits", label: "기회 탐색" },
  { key: "assets", href: "/wallet", label: "내 자산" },
  { key: "alerts", href: "/me/inbox", label: "알림" },
  { key: "more", href: "/me", label: "더보기" },
] as const;

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

function nextCopy(state: TradeExecutionState): string | null {
  const kind = consumerState(state);
  switch (kind) {
    case "MatchingInProgress":
    case "MatchingRetrying":
      return "결과가 나오면 이 화면에서 바로 확인할 수 있어요.";
    case "Settled":
      return "확정된 수익은 지갑에서 확인할 수 있어요.";
    case "StoppedSafely":
    case "Cancelled":
      return "다른 기회를 이어서 볼 수 있어요.";
    case "Failed":
      return "도움이 필요하면 고객지원으로 문의해 주세요.";
    default:
      return state.status === "success"
        ? "처리가 끝나면 이 화면에서 결과를 확인할 수 있어요."
        : null;
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
      data-testid="trade-execute"
      data-execution-transport={transport}
      data-consumer-state={consumer ?? "loading"}
      data-trade-status={tradeStatus ?? ""}
      data-live={live ? "true" : "false"}
      data-execute-chrome="true"
    >
      <aside className={styles.sidebar} data-execute-chrome="desktop">
        <p className={styles.wordmark}>퍼뜩</p>
        <p className={styles.tagline}>참여 진행</p>
        <nav className={styles.sideNav} aria-label="주요 메뉴">
          {DESKTOP_NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={
                item.key === "participations"
                  ? `${styles.sideLink} ${styles.isActive}`
                  : styles.sideLink
              }
              aria-current={item.key === "participations" ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.column}>
        <header className={styles.topbar} data-execute-chrome="mobile-top">
          <Link className={styles.back} href="/profits">
            <span aria-hidden>‹</span>
            기회 탐색
          </Link>
          <p className={styles.brand}>퍼뜩</p>
          <Link className={styles.inbox} href="/me/inbox">
            알림
          </Link>
        </header>
        <div className={styles.body}>{children}</div>
        <nav
          className={styles.tabbar}
          data-execute-chrome="mobile-nav"
          aria-label="주요 화면"
        >
          {MOBILE_NAV.map((item) => (
            <Link key={item.key} className={styles.tab} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}

function Context({ state }: { state: TradeExecutionState }) {
  const label = state.asset?.label?.trim() || null;
  const next = nextCopy(state);
  return (
    <section className={styles.context} data-execute-context="true">
      {label ? (
        <p className={styles.contextRow}>
          <span>상품</span>
          <strong>{label}</strong>
        </p>
      ) : null}
      {next ? (
        <p className={styles.contextRow} data-execute-next="true">
          <span>다음</span>
          <strong>{next}</strong>
        </p>
      ) : null}
    </section>
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

  return (
    <Shell
      transport={transport}
      consumer={kind ?? undefined}
      tradeStatus={state.status}
      live={live}
    >
      <h1 className={styles.title}>{TITLE}</h1>
      <p className={styles.lead}>{meaningCopy(state)}</p>
      <Context state={state} />
      {kind === "MatchingInProgress" || kind === "MatchingRetrying" ? (
        <div className={styles.motion} aria-hidden>
          <span className={styles.orbit} />
          <span className={styles.spark} />
        </div>
      ) : null}
      {kind === "MatchingInProgress" || kind === "MatchingRetrying" ? (
        <>
          {formatUsdtDisplay(state.expectedProfitUsdt) ? (
            <dl className={styles.facts}>
              <div>
                <dt>예상 수익</dt>
                <dd>{usdtLine(state.expectedProfitUsdt)}</dd>
              </div>
            </dl>
          ) : null}
          <p className={styles.note}>아직 확정된 수익이 아니에요. 결과가 나올 때까지 기다려 주세요.</p>
        </>
      ) : null}
      {settled ? (
        <dl className={styles.facts}>
          <div>
            <dt>확정 수익</dt>
            <dd data-sdr-settled="true">{usdtLine(state.settledProfitUsdt)}</dd>
          </div>
        </dl>
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
        <Link className={styles.secondary} href="/trades">
          참여 내역
        </Link>
        <Link className={styles.secondary} href="/">
          홈으로
        </Link>
      </div>
    </Shell>
  );
}
