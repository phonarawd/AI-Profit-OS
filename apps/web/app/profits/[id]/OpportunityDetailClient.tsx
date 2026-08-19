"use client";

import {
  issuePreflight,
  isParticipateError,
  newParticipateIdempotencyKey,
  postParticipate,
} from "@aipo/sdk/participate";
import {
  fetchOpportunityDetail,
  isOpportunityFeedError,
  type OpportunityDetailResponse,
  type OpportunityFeedItem,
} from "@aipo/sdk/user-feed";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./opportunity-detail.module.css";

const USDT_DEC = /^-?[0-9]+(\.[0-9]+)?$/;

const CTA_DETAIL = "이 기회로 수익 벌기";
const CTA_CONFIRM = "수익 벌기";
const MAY_STOP = "시세가 움직이면 안전하게 멈출 수 있어요";
const DISCLAIMER = "예상 결과는 시장 상황에 따라 달라질 수 있습니다.";

type ViewKind = "loading" | "unauthorized" | "missing" | "error" | "ready";

function idemStorageKey(opportunityId: string): string {
  return `putduk.participate.idem.${opportunityId}`;
}

function readOrCreateIdempotencyKey(opportunityId: string): string {
  try {
    const existing = sessionStorage.getItem(idemStorageKey(opportunityId));
    if (existing && existing.length >= 8) return existing;
    const next = newParticipateIdempotencyKey();
    sessionStorage.setItem(idemStorageKey(opportunityId), next);
    return next;
  } catch {
    return newParticipateIdempotencyKey();
  }
}

function clearIdempotencyKey(opportunityId: string): void {
  try {
    sessionStorage.removeItem(idemStorageKey(opportunityId));
  } catch {
    /* ignore */
  }
}

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

function durationLabel(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return "—";
  return `${Math.max(1, Math.round(sec / 60)).toLocaleString("en-US")}분`;
}

function canParticipate(item: OpportunityFeedItem): boolean {
  return (
    item.status === "available" &&
    item.bucket !== "nearMiss" &&
    item.bucket !== "lockedHigh" &&
    item.compareReady !== false &&
    typeof item.pricingVersion === "number" &&
    item.pricingVersion >= 1 &&
    typeof item.requiredCapitalUsdt === "string" &&
    typeof item.expectedProfitUsdt === "string"
  );
}

function needsFunding(item: OpportunityFeedItem): boolean {
  if (item.bucket === "nearMiss") return true;
  const suggest = item.suggestDepositUsdt;
  return typeof suggest === "string" && suggest !== "0" && /^-?[0-9]+(\.[0-9]+)?$/.test(suggest);
}

function recoveryCopy(code: string | null, status: number): string {
  switch (code) {
    case "AUTH_REQUIRED":
      return "로그인이 필요해요.";
    case "PREFLIGHT_REQUIRED":
      return "확인을 다시 한 뒤 눌러 주세요.";
    case "INSUFFICIENT_PRINCIPAL":
    case "INSUFFICIENT_BALANCE":
      return "원금이 부족해요. 입금한 뒤 다시 시도해 주세요.";
    case "PRICE_STALE":
    case "PRICE_STALE_DATA":
      return "시세가 바뀌었어요. 목록에서 다시 확인해 주세요.";
    case "OPPORTUNITY_EXPIRED":
      return "이 기회는 이제 없어요.";
    case "MATCH_BLOCKED":
    case "COMPARE_NOT_READY":
    case "CIRCUIT_OPEN":
    case "CAPITAL_BAND_LOCKED":
    case "DAILY_MATCH_CAP":
    case "NO_SLOTS":
      return "지금은 이 기회로 수익을 벌 수 없어요.";
    case "VALIDATION_ERROR":
      return "필요 금액이 바뀌었어요. 다시 확인해 주세요.";
    case "NETWORK_ERROR":
      return "연결이 불안정해요. 다시 시도해 주세요.";
    default:
      if (status === 401) return "로그인이 필요해요.";
      if (status === 404) return "이 기회는 이제 없어요.";
      return "지금은 처리할 수 없어요. 잠시 후 다시 시도해 주세요.";
  }
}

export function OpportunityDetailClient({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [kind, setKind] = useState<ViewKind>("loading");
  const [detail, setDetail] = useState<OpportunityDetailResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preflightToken, setPreflightToken] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const next = await fetchOpportunityDetail(opportunityId, {
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setDetail(next);
        setKind("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isOpportunityFeedError(err) && err.status === 401) {
          setKind("unauthorized");
          return;
        }
        if (isOpportunityFeedError(err) && err.status === 404) {
          setKind("missing");
          return;
        }
        setKind("error");
      }
    })();
    return () => ac.abort();
  }, [opportunityId]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (preflightToken) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [preflightToken]);

  async function openConfirm() {
    if (!detail || busy || !canParticipate(detail.item)) return;
    setBusy(true);
    setNotice(null);
    try {
      const issued = await issuePreflight(opportunityId);
      setPreflightToken(issued.preflightToken);
    } catch (err) {
      if (isParticipateError(err) && err.code === "AUTH_REQUIRED") {
        setKind("unauthorized");
        return;
      }
      const code = isParticipateError(err) ? err.code : "NETWORK_ERROR";
      const status = isParticipateError(err) ? err.status : 0;
      setNotice(recoveryCopy(code, status));
    } finally {
      setBusy(false);
    }
  }

  function closeConfirm() {
    setPreflightToken(null);
  }

  async function submitParticipate(token: string) {
    const item = detail?.item;
    if (!item || !canParticipate(item)) return;
    const amountUsdt = item.requiredCapitalUsdt;
    const minProfitUsdt = item.expectedProfitUsdt;
    const pricingVersion = item.pricingVersion;
    if (!amountUsdt || !minProfitUsdt || pricingVersion == null) return;

    setBusy(true);
    setNotice(null);
    try {
      const result = await postParticipate(
        opportunityId,
        {
          opportunityId,
          pricingVersion,
          minProfitUsdt,
          amountUsdt,
          idempotencyKey: readOrCreateIdempotencyKey(opportunityId),
          preflightToken: token,
        },
      );
      clearIdempotencyKey(opportunityId);
      router.push(`/trades/${result.tradeId}/execute`);
    } catch (err) {
      if (isParticipateError(err) && err.code === "PREFLIGHT_REQUIRED") {
        try {
          const issued = await issuePreflight(opportunityId);
          const retry = await postParticipate(
            opportunityId,
            {
              opportunityId,
              pricingVersion,
              minProfitUsdt,
              amountUsdt,
              idempotencyKey: readOrCreateIdempotencyKey(opportunityId),
              preflightToken: issued.preflightToken,
            },
          );
          clearIdempotencyKey(opportunityId);
          router.push(`/trades/${retry.tradeId}/execute`);
          return;
        } catch (retryErr) {
          const code = isParticipateError(retryErr) ? retryErr.code : "PREFLIGHT_REQUIRED";
          const status = isParticipateError(retryErr) ? retryErr.status : 412;
          if (code === "AUTH_REQUIRED") {
            setKind("unauthorized");
            return;
          }
          setPreflightToken(null);
          setNotice(recoveryCopy(code, status));
          return;
        }
      }
      if (isParticipateError(err) && err.code === "AUTH_REQUIRED") {
        setKind("unauthorized");
        return;
      }
      const code = isParticipateError(err) ? err.code : "NETWORK_ERROR";
      const status = isParticipateError(err) ? err.status : 0;
      if (code === "INSUFFICIENT_PRINCIPAL" || code === "INSUFFICIENT_BALANCE") {
        setPreflightToken(null);
      }
      setNotice(recoveryCopy(code, status));
    } finally {
      setBusy(false);
    }
  }

  if (kind === "loading") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>기회 상세</h1>
        <p className={styles.lead}>불러오는 중…</p>
      </main>
    );
  }

  if (kind === "unauthorized") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>기회 상세</h1>
        <p className={styles.lead}>로그인하면 이 기회를 확인할 수 있어요.</p>
        <div className={styles.actions}>
          <Link href="/auth/login">로그인</Link>
          <Link className={styles.secondary} href="/profits">
            목록으로
          </Link>
        </div>
      </main>
    );
  }

  if (kind === "missing") {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>기회 상세</h1>
        <p className={styles.lead}>이 기회는 이제 없어요.</p>
        <div className={styles.actions}>
          <Link href="/profits">다른 기회 보기</Link>
        </div>
      </main>
    );
  }

  if (kind === "error" || !detail) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>기회 상세</h1>
        <p className={styles.err}>기회를 불러오지 못했어요.</p>
        <div className={styles.actions}>
          <Link href="/profits">목록으로</Link>
        </div>
      </main>
    );
  }

  const item = detail.item;
  const joinable = canParticipate(item);
  const funding = needsFunding(item);
  const locked = item.bucket === "lockedHigh" || item.compareReady === false;
  const suggest =
    typeof item.suggestDepositUsdt === "string" && item.suggestDepositUsdt !== "0"
      ? usdtLine(item.suggestDepositUsdt)
      : null;

  return (
    <main className={styles.page}>
      <p className={styles.nav}>
        <Link href="/profits">기회 목록</Link>
      </p>
      <h1 className={styles.title}>기회 상세</h1>
      <p className={styles.lead}>
        {item.assetLabel?.trim() || item.arbitrageTypeKo?.trim() || "이 기회"}
      </p>
      <dl className={styles.facts}>
        <div>
          <dt>필요 금액</dt>
          <dd>{usdtLine(item.requiredCapitalUsdt)}</dd>
        </div>
        <div>
          <dt>기대 결과</dt>
          <dd>{usdtLine(item.expectedProfitUsdt)}</dd>
        </div>
        <div>
          <dt>예상 시간</dt>
          <dd>{durationLabel(item.estimatedDurationSec)}</dd>
        </div>
        {detail.principalUsdt != null ? (
          <div>
            <dt>내 원금</dt>
            <dd>{usdtLine(detail.principalUsdt)}</dd>
          </div>
        ) : null}
      </dl>
      <p className={styles.note}>{DISCLAIMER}</p>
      <p className={styles.note}>{MAY_STOP}</p>
      {notice ? <p className={styles.err}>{notice}</p> : null}
      {locked ? (
        <p className={styles.warn}>지금은 이 기회로 수익을 벌 수 없어요.</p>
      ) : null}
      {funding ? (
        <p className={styles.warn}>
          원금이 부족해요.
          {suggest && suggest !== "—" ? ` 부족한 금액 ${suggest}` : null}
        </p>
      ) : null}
      <div className={styles.actions}>
        {joinable ? (
          <button
            type="button"
            data-requires-preflight="true"
            disabled={busy}
            onClick={() => void openConfirm()}
          >
            {CTA_DETAIL}
          </button>
        ) : null}
        {funding ? <Link href="/wallet/deposit">입금하기</Link> : null}
        {!joinable && !funding && !locked ? (
          <p className={styles.warn}>지금은 이 기회로 수익을 벌 수 없어요.</p>
        ) : null}
        <Link className={styles.secondary} href="/profits">
          목록으로
        </Link>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={closeConfirm}
      >
        <h2 id={titleId}>이 금액으로 수익을 벌까요?</h2>
        <dl className={styles.facts}>
          <div>
            <dt>잠길 원금</dt>
            <dd>{usdtLine(item.requiredCapitalUsdt)}</dd>
          </div>
          <div>
            <dt>기대 결과</dt>
            <dd>{usdtLine(item.expectedProfitUsdt)}</dd>
          </div>
        </dl>
        <p className={styles.note}>{MAY_STOP}</p>
        <p className={styles.note}>{DISCLAIMER}</p>
        {notice ? <p className={styles.err}>{notice}</p> : null}
        <div className={styles.dialogActions}>
          <button
            type="button"
            disabled={busy || !preflightToken}
            onClick={() => {
              if (preflightToken) void submitParticipate(preflightToken);
            }}
          >
            {CTA_CONFIRM}
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={closeConfirm}
          >
            닫기
          </button>
        </div>
      </dialog>
    </main>
  );
}
