"use client";

import {
  fetchUserJournal,
  isLedgerRequestError,
  type UserJournal,
} from "@aipo/sdk/ledger";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import styles from "../../wallet.module.css";

const TITLE = "내역 상세";

type ViewKind =
  | "loading"
  | "ready"
  | "missing"
  | "unavailable"
  | "unauthorized"
  | "forbidden";

function sessionToken(): string | null {
  return null;
}

function meaningForType(journalType: string): string {
  const t = journalType.toLowerCase();
  if (t.includes("settlement") || t.includes("settle") || t.includes("match")) {
    return "정산";
  }
  if (t.includes("deposit")) return "입금";
  if (t.includes("withdraw")) return "출금";
  return "확인할 수 없음";
}

function directionCopy(direction: "debit" | "credit"): string {
  return direction === "credit" ? "들어옴" : "나감";
}

function formatWhen(iso: string): string {
  if (!iso) return "확인할 수 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "확인할 수 없음";
  return d.toLocaleString("ko-KR");
}

function Shell({
  view,
  children,
}: {
  view: ViewKind;
  children: ReactNode;
}) {
  return (
    <main
      className={styles.page}
      data-testid="wallet-history-detail"
      data-history-detail-view={view}
    >
      {children}
    </main>
  );
}

export function HistoryDetailClient({ journalId }: { journalId: string }) {
  const [journal, setJournal] = useState<UserJournal | null>(null);
  const [view, setView] = useState<ViewKind>("loading");

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const next = await fetchUserJournal(journalId, {
          getAccessToken: sessionToken,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setJournal(next);
        setView("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        setJournal(null);
        if (isLedgerRequestError(err) && err.code === "AUTH_REQUIRED") {
          setView("unauthorized");
          return;
        }
        if (isLedgerRequestError(err) && err.code === "FORBIDDEN") {
          setView("forbidden");
          return;
        }
        if (isLedgerRequestError(err) && err.code === "NOT_FOUND") {
          setView("missing");
          return;
        }
        setView("unavailable");
      }
    })();
    return () => ac.abort();
  }, [journalId]);

  if (view === "loading") {
    return (
      <Shell view="loading">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>불러오는 중…</p>
      </Shell>
    );
  }

  if (view === "unauthorized") {
    return (
      <Shell view="unauthorized">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.lead}>로그인하면 내역을 볼 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
        </div>
      </Shell>
    );
  }

  if (view === "forbidden") {
    return (
      <Shell view="forbidden">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.err}>다른 분의 내역은 볼 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/wallet/history">내역으로</Link>
        </div>
      </Shell>
    );
  }

  if (view === "missing") {
    return (
      <Shell view="missing">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.note}>이 내역을 찾을 수 없어요.</p>
        <div className={styles.actions}>
          <Link href="/wallet/history">내역으로</Link>
        </div>
      </Shell>
    );
  }

  if (view === "unavailable" || journal == null) {
    return (
      <Shell view="unavailable">
        <h1 className={styles.title}>{TITLE}</h1>
        <p className={styles.err}>내역을 확인할 수 없음</p>
        <div className={styles.actions}>
          <Link href="/wallet/history">내역으로</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell view="ready">
      <p className={styles.nav}>
        <Link href="/wallet/history">내역</Link>
      </p>
      <h1 className={styles.title}>{TITLE}</h1>
      <dl className={styles.facts} data-testid="history-detail-facts">
        <div>
          <dt>종류</dt>
          <dd>{meaningForType(journal.journalType)}</dd>
        </div>
        <div>
          <dt>시각</dt>
          <dd>{formatWhen(journal.createdAt)}</dd>
        </div>
      </dl>
      <ul className={styles.list} data-testid="history-detail-entries">
        {journal.entries.length === 0 ? (
          <li className={styles.note}>줄을 확인할 수 없음</li>
        ) : (
          journal.entries.map((entry) => (
            <li key={entry.id} className={styles.row}>
              <p className={styles.rowMeta}>{directionCopy(entry.direction)}</p>
              <p className={styles.rowAmt}>
                {entry.amountUsdt ? `${entry.amountUsdt} USDT` : "확인할 수 없음"}
              </p>
            </li>
          ))
        )}
      </ul>
      <div className={styles.actions}>
        <Link href="/wallet/history">내역으로</Link>
        <Link className={styles.secondary} href="/wallet">
          지갑으로
        </Link>
      </div>
    </Shell>
  );
}
