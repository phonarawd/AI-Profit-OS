"use client";

import { fetchCurrentFxApprox } from "@aipo/sdk/current-fx";
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
import { fetchWalletBuckets } from "@aipo/sdk/wallet";
import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OpportunityRoomDesktop } from "../../../components/spark-dash-room/OpportunityRoomDesktop";
import { OpportunityRoomMobile } from "../../../components/spark-dash-room/OpportunityRoomMobile";
import { ParticipateConfirmSheet } from "../../../components/spark-dash-room/ParticipateConfirmSheet";
import {
  canParticipateOpportunity,
  emptyOpportunityRoomModel,
  mapOpportunityRoom,
} from "../../../components/spark-dash-room/map-runtime";
import {
  CODE_PREFLIGHT_REQUIRED,
  PHASE_ACCEPTED,
  PHASE_CLOSED,
  PHASE_ERROR,
  PHASE_ISSUING,
  PHASE_READY,
  PHASE_REUSED,
  PHASE_SUBMITTING,
  formatConfirmRemain,
  isParticipateSheetErrorCode,
  recoveryCopy,
  type ParticipateSheetPhase,
} from "../../../components/spark-dash-room/participate-sheet";
import type { OpportunityRoomModel } from "../../../components/spark-dash-room/types";
import { formatUsdtDisplay } from "../../../components/spark-dash-home/format";

const CTA_DETAIL = "이 기회로 수익 벌기";
const MAY_STOP = "시세가 움직이면 안전하게 멈출 수 있어요";

type ViewKind = "loading" | "unauthorized" | "missing" | "error" | "ready";

type SheetState = {
  phase: ParticipateSheetPhase;
  token: string | null;
  expiresAt: string | null;
  errorCode: string | null;
  errorStatus: number;
  tradeId: string | null;
};

const SHEET_CLOSED: SheetState = {
  phase: PHASE_CLOSED,
  token: null,
  expiresAt: null,
  errorCode: null,
  errorStatus: 0,
  tradeId: null,
};

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

function usdtLine(raw: string | null | undefined): string {
  const body = formatUsdtDisplay(raw);
  return body ? `${body} USDT` : "—";
}

function canParticipate(item: OpportunityFeedItem): boolean {
  return canParticipateOpportunity(item);
}

function needsFunding(item: OpportunityFeedItem): boolean {
  if (item.bucket === "nearMiss") return true;
  const suggest = item.suggestDepositUsdt;
  return typeof suggest === "string" && suggest !== "0" && /^-?[0-9]+(\.[0-9]+)?$/.test(suggest);
}

function errorSheet(code: string | null, status: number): SheetState {
  return {
    phase: PHASE_ERROR,
    token: null,
    expiresAt: null,
    errorCode: isParticipateSheetErrorCode(code) ? code : code,
    errorStatus: status,
    tradeId: null,
  };
}

export function OpportunityDetailClient({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [kind, setKind] = useState<ViewKind>("loading");
  const [detail, setDetail] = useState<OpportunityDetailResponse | null>(null);
  const [model, setModel] = useState<OpportunityRoomModel>(
    emptyOpportunityRoomModel("LOADING"),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(SHEET_CLOSED);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [next, buckets] = await Promise.all([
          fetchOpportunityDetail(opportunityId, { signal: ac.signal }),
          fetchWalletBuckets({ signal: ac.signal }).catch(() => null),
        ]);
        if (ac.signal.aborted) return;
        const fx = buckets
          ? await fetchCurrentFxApprox(
              {
                principalUsdt: buckets.principalUsdt,
                withdrawableProfitUsdt: buckets.profitUsdt,
                expectedProfitUsdt: next.item.expectedProfitUsdt,
              },
              { signal: ac.signal },
            ).catch(() => null)
          : null;
        if (ac.signal.aborted) return;
        setDetail(next);
        setModel(
          mapOpportunityRoom({
            buckets,
            fx,
            item: next.item,
            displayName: null,
            viewState: "READY",
          }),
        );
        setKind("ready");
      } catch (err) {
        if (ac.signal.aborted) return;
        if (isOpportunityFeedError(err) && err.status === 401) {
          setKind("unauthorized");
          setModel(emptyOpportunityRoomModel("UNAUTHORIZED"));
          return;
        }
        if (isOpportunityFeedError(err) && err.status === 404) {
          setKind("missing");
          setModel(emptyOpportunityRoomModel("EMPTY"));
          return;
        }
        setKind("error");
        setModel(emptyOpportunityRoomModel("ERROR"));
      }
    })();
    return () => ac.abort();
  }, [opportunityId]);

  useEffect(() => {
    if (sheet.phase !== PHASE_READY || !sheet.expiresAt) return;
    const tick = () => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      if (Date.parse(sheet.expiresAt) <= nextNow) {
        setSheet(errorSheet(CODE_PREFLIGHT_REQUIRED, 412));
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sheet.phase, sheet.expiresAt]);

  useEffect(() => {
    if ((sheet.phase !== PHASE_ACCEPTED && sheet.phase !== PHASE_REUSED) || !sheet.tradeId) {
      return;
    }
    const href = `/trades/${sheet.tradeId}/execute`;
    const id = window.setTimeout(() => {
      router.push(href);
    }, 900);
    return () => window.clearTimeout(id);
  }, [sheet.phase, sheet.tradeId, router]);

  async function openConfirm() {
    if (!detail || submittingRef.current || !canParticipate(detail.item)) {
      return;
    }
    setNotice(null);
    setSheet({
      phase: PHASE_ISSUING,
      token: null,
      expiresAt: null,
      errorCode: null,
      errorStatus: 0,
      tradeId: null,
    });
    try {
      const issued = await issuePreflight(opportunityId);
      setSheet({
        phase: PHASE_READY,
        token: issued.preflightToken,
        expiresAt: issued.expiresAt,
        errorCode: null,
        errorStatus: 0,
        tradeId: null,
      });
      setNowMs(Date.now());
    } catch (err) {
      if (isParticipateError(err) && err.code === "AUTH_REQUIRED") {
        setSheet(SHEET_CLOSED);
        setKind("unauthorized");
        setModel(emptyOpportunityRoomModel("UNAUTHORIZED"));
        return;
      }
      const code = isParticipateError(err) ? err.code : "NETWORK_ERROR";
      const status = isParticipateError(err) ? err.status : 0;
      setSheet(errorSheet(code, status));
    }
  }

  function closeConfirm() {
    if (sheet.phase === PHASE_SUBMITTING || sheet.phase === PHASE_ACCEPTED || sheet.phase === PHASE_REUSED) {
      return;
    }
    setSheet(SHEET_CLOSED);
  }

  async function submitParticipate(token: string) {
    const item = detail?.item;
    if (!item || !canParticipate(item) || submittingRef.current) return;
    const amountUsdt = item.requiredCapitalUsdt;
    const minProfitUsdt = item.expectedProfitUsdt;
    const pricingVersion = item.pricingVersion;
    if (!amountUsdt || !minProfitUsdt || pricingVersion == null) return;

    submittingRef.current = true;
    setNotice(null);
    setSheet((prev) => ({ ...prev, phase: PHASE_SUBMITTING, errorCode: null, errorStatus: 0 }));
    try {
      const result = await postParticipate(opportunityId, {
        opportunityId,
        pricingVersion,
        minProfitUsdt,
        amountUsdt,
        idempotencyKey: readOrCreateIdempotencyKey(opportunityId),
        preflightToken: token,
      });
      clearIdempotencyKey(opportunityId);
      const acceptedHref = `/trades/${result.tradeId}/execute`;
      router.prefetch(acceptedHref);
      setSheet({
        phase: result.reused ? PHASE_REUSED : PHASE_ACCEPTED,
        token: null,
        expiresAt: null,
        errorCode: null,
        errorStatus: 0,
        tradeId: result.tradeId,
      });
    } catch (err) {
      if (isParticipateError(err) && err.code === CODE_PREFLIGHT_REQUIRED) {
        setSheet(errorSheet(CODE_PREFLIGHT_REQUIRED, 412));
        return;
      }
      if (isParticipateError(err) && err.code === "AUTH_REQUIRED") {
        setSheet(SHEET_CLOSED);
        setKind("unauthorized");
        setModel(emptyOpportunityRoomModel("UNAUTHORIZED"));
        return;
      }
      const code = isParticipateError(err) ? err.code : "NETWORK_ERROR";
      const status = isParticipateError(err) ? err.status : 0;
      setSheet(errorSheet(code, status));
      if (code === "INSUFFICIENT_PRINCIPAL" || code === "INSUFFICIENT_BALANCE") {
        setNotice(recoveryCopy(code, status));
      }
    } finally {
      submittingRef.current = false;
    }
  }

  const item = detail?.item;
  const joinable = item ? canParticipate(item) : false;
  const funding = item ? needsFunding(item) : false;
  const locked = item
    ? item.bucket === "lockedHigh" || item.compareReady === false
    : false;
  const busy = sheet.phase === PHASE_ISSUING || sheet.phase === PHASE_SUBMITTING;
  const remain =
    sheet.phase === PHASE_READY
      ? formatConfirmRemain(sheet.expiresAt, nowMs)
      : null;

  const noticeNode = notice ? <p className="sdr-err">{notice}</p> : null;
  const noticeNodeMobile = notice ? <p className="sdrm-cta-err">{notice}</p> : null;

  function ctaNodes(variant: "desktop" | "mobile") {
    const isMobile = variant === "mobile";
    const primaryClass = isMobile ? "sdrm-cta" : undefined;
    const secondaryClass = isMobile ? "sdrm-cta-secondary" : "sdr-secondary";
    const warnClass = isMobile ? "sdrm-cta-warn" : "sdr-warn";
    return (
      <>
        {kind === "unauthorized" ? (
          <>
            <Link className={primaryClass} href="/auth/login">
              로그인
            </Link>
            <Link className={secondaryClass} href="/profits">
              목록으로
            </Link>
          </>
        ) : null}
        {kind === "missing" || kind === "error" ? (
          <Link className={primaryClass} href="/profits">
            목록으로
          </Link>
        ) : null}
        {kind === "ready" && joinable ? (
          <button
            type="button"
            className={primaryClass}
            data-requires-preflight="true"
            disabled={busy}
            onClick={() => void openConfirm()}
          >
            {CTA_DETAIL}
            {isMobile ? null : " →"}
          </button>
        ) : null}
        {kind === "ready" && funding ? (
          <Link className={primaryClass} href="/wallet/deposit">
            입금하기
          </Link>
        ) : null}
        {kind === "ready" && !joinable && !funding && !locked ? (
          <p className={warnClass}>지금은 이 기회로 수익을 벌 수 없어요.</p>
        ) : null}
      </>
    );
  }

  const primaryCta = <div className="sdr-actions">{ctaNodes("desktop")}</div>;
  const primaryCtaMobile =
    kind === "loading" ? null : (
      <div className="sdrm-cta-actions">{ctaNodes("mobile")}</div>
    );

  const confirmSheet = item ? (
    <ParticipateConfirmSheet
      open={sheet.phase !== PHASE_CLOSED}
      phase={sheet.phase}
      errorCode={sheet.errorCode}
      errorStatus={sheet.errorStatus}
      capitalLine={usdtLine(item.requiredCapitalUsdt)}
      profitLine={usdtLine(item.expectedProfitUsdt)}
      remain={remain}
      mayStop={MAY_STOP}
      onClose={closeConfirm}
      onConfirm={() => {
        if (sheet.token) void submitParticipate(sheet.token);
      }}
      onRetryConfirm={() => void openConfirm()}
      tradeHref={sheet.tradeId ? `/trades/${sheet.tradeId}/execute` : null}
    />
  ) : null;

  return (
    <div data-testid="opportunity-detail" data-detail-state={kind}>
      <div className="sd-desktop-only">
        <OpportunityRoomDesktop
          model={model}
          primaryCta={primaryCta}
          notice={noticeNode}
        />
      </div>
      <div className="sd-mobile-placeholder">
        <OpportunityRoomMobile
          model={model}
          primaryCta={primaryCtaMobile}
          notice={noticeNodeMobile}
        />
      </div>
      <aside data-testid="objection-q1-mini" className="sdr-trust">
        <p>{T.objections.q1.oneLiner}</p>
        <Link href="/me/guide/revenue">{T.objections.detailLink}</Link>
      </aside>
      {confirmSheet}
    </div>
  );
}
