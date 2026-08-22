"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { TaxDisclaimerBlock } from "@aipo/ui/components/trust";
import { T } from "@aipo/ui/copy/ko";
import {
  adminGet,
  adminSend,
  newIdempotencyKey,
  type AdminResult,
} from "../../../lib/admin-api";
import {
  asRecordList,
  readAmount,
  readText,
} from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = [
  "simulation",
  "referral",
  "notices",
  "campaigns",
  "missions",
  "share",
  "content",
  "deposit",
  "whale",
  "ticker",
  "partners",
] as const;
type GrowthTab = (typeof TABS)[number];

const TAB_LABEL: Record<GrowthTab, string> = {
  simulation: "시뮬레이션",
  referral: "초대",
  notices: "공지",
  campaigns: "캠페인",
  missions: "혜택·미션",
  share: "공유 카드",
  content: "G1",
  deposit: "G2",
  whale: "G3",
  ticker: "G4",
  partners: "공식 협력사",
};

const TICKER_MODE_LABEL: Record<string, string> = {
  off: "꺼짐",
  live: "실시간",
  demo: "미리보기",
  hybrid: "혼합",
};
const COUNTER_MODE_LABEL: Record<string, string> = {
  off: "꺼짐",
  ledger: "장부",
  demo: "미리보기",
  blended: "혼합",
};

const KRW_STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  matched: "대조됨",
  approved: "승인(입금 반영)",
  rejected: "거절",
  expired: "만료",
  manual_review: "수동 확인",
};

/**
 * Admin §35.6 / Engine §51.4 — `/admin/growth?tab=*`
 * 하위 /admin/growth/{content,deposit,whale,ticker} 는 레거시 리다이렉트(이중 IA 금지).
 * 광고 성과·자동운영 = POST 이후. 이 화면에서 위조 0.
 */
function GrowthContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): GrowthTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as GrowthTab;
    }
    return "simulation";
  }, [searchParams]);

  const programApi = "/api/v1/admin/growth/referral/program";
  const poolApi = "/api/v1/admin/growth/referral/pool";
  const holdQueueApi = "/api/v1/admin/growth/referral/hold-queue";
  const topUpApi = "/api/v1/admin/growth/referral/pool/top-up";
  const accrualHaltApi = "/api/v1/admin/growth/referral/accrual-halt";
  const simLatestApi = "/api/v1/admin/simulation/latest";
  const simGrowthGateApi = "/api/v1/admin/simulation/growth-gate";
  const growthEnabledApi = "/api/v1/admin/growth/enabled";
  const tickerApi = "/api/v1/admin/growth/ticker";
  const whaleOppApi = "/api/v1/admin/opportunities?capitalBand=whale";
  const financeApi = "/api/v1/admin/reports/financial?granularity=day";

  const [latest, setLatest] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [gate, setGate] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [enabled, setEnabled] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [program, setProgram] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [pool, setPool] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [holdQueue, setHoldQueue] = useState<AdminResult<unknown> | null>(null);
  const [pendingKrw, setPendingKrw] = useState<AdminResult<unknown> | null>(null);
  const [approvedKrw, setApprovedKrw] = useState<AdminResult<unknown> | null>(
    null,
  );
  const [rejectedKrw, setRejectedKrw] = useState<AdminResult<unknown> | null>(
    null,
  );
  const [finance, setFinance] = useState<AdminResult<unknown> | null>(null);
  const [ticker, setTicker] = useState<AdminResult<Record<string, unknown>> | null>(
    null,
  );
  const [whaleOpps, setWhaleOpps] = useState<AdminResult<unknown> | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [tickerMode, setTickerMode] = useState("off");
  const [counterMode, setCounterMode] = useState("off");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "simulation") {
        const [l, g, e] = await Promise.all([
          adminGet<Record<string, unknown>>(simLatestApi),
          adminGet<Record<string, unknown>>(simGrowthGateApi),
          adminGet<Record<string, unknown>>(growthEnabledApi),
        ]);
        if (cancelled) return;
        setLatest(l);
        setGate(g);
        setEnabled(e);
        return;
      }
      if (tab === "referral") {
        const [p, po, h] = await Promise.all([
          adminGet<Record<string, unknown>>(programApi),
          adminGet<Record<string, unknown>>(poolApi),
          adminGet<unknown>(holdQueueApi),
        ]);
        if (cancelled) return;
        setProgram(p);
        setPool(po);
        setHoldQueue(h);
        return;
      }
      if (tab === "deposit") {
        const [pend, appr, rej, fin] = await Promise.all([
          adminGet<unknown>(
            "/api/v1/admin/wallet/krw-deposit-requests?status=pending",
          ),
          adminGet<unknown>(
            "/api/v1/admin/wallet/krw-deposit-requests?status=approved",
          ),
          adminGet<unknown>(
            "/api/v1/admin/wallet/krw-deposit-requests?status=rejected",
          ),
          adminGet<unknown>(financeApi),
        ]);
        if (cancelled) return;
        setPendingKrw(pend);
        setApprovedKrw(appr);
        setRejectedKrw(rej);
        setFinance(fin);
        return;
      }
      if (tab === "ticker") {
        const res = await adminGet<Record<string, unknown>>(tickerApi);
        if (cancelled) return;
        setTicker(res);
        if (res.ok) {
          const mode = readText(res.data.tickerMode);
          const counter = readText(res.data.counterMode);
          if (mode) setTickerMode(mode);
          if (counter) setCounterMode(counter);
        }
        return;
      }
      if (tab === "whale") {
        const res = await adminGet<unknown>(whaleOppApi);
        if (!cancelled) setWhaleOpps(res);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    simLatestApi,
    simGrowthGateApi,
    growthEnabledApi,
    programApi,
    poolApi,
    holdQueueApi,
    tickerApi,
    whaleOppApi,
    financeApi,
  ]);

  async function setGrowthOn(next: boolean) {
    if (changeReason.trim().length < 4) {
      setActionNote("변경 사유는 4자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm(next ? "성장 기능을 켤까요?" : "성장 기능을 끌까요?")) {
      return;
    }
    const res = await adminSend(growthEnabledApi, "PATCH", {
      enabled: next,
      changeReason: changeReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) {
      setEnabled(await adminGet(growthEnabledApi));
      setGate(await adminGet(simGrowthGateApi));
    }
  }

  async function haltAccrual(halted: boolean) {
    if (changeReason.trim().length < 10) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm(halted ? "적립을 멈출까요?" : "적립을 다시 켤까요?")) {
      return;
    }
    const res = await adminSend(accrualHaltApi, "POST", {
      halted,
      changeReason: changeReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setProgram(await adminGet(programApi));
  }

  async function topUpPool() {
    if (!readAmount(topUpAmount)) {
      setActionNote("넣을 금액을 확인할 수 없습니다.");
      return;
    }
    if (changeReason.trim().length < 10) {
      setActionNote("사유는 10자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm("초대 풀에 넣을까요? 잔액은 분개로만 움직입니다.")) {
      return;
    }
    const res = await adminSend(topUpApi, "POST", {
      amountUsdt: topUpAmount.trim(),
      changeReason: changeReason.trim(),
      idempotencyKey: newIdempotencyKey(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setPool(await adminGet(poolApi));
  }

  async function saveTicker() {
    if (changeReason.trim().length < 4) {
      setActionNote("변경 사유는 4자 이상이어야 합니다.");
      return;
    }
    if (!window.confirm("시세 띠 설정을 바꿀까요?")) return;
    const res = await adminSend(tickerApi, "PATCH", {
      tickerMode,
      counterMode,
      changeReason: changeReason.trim(),
    });
    setActionNote(res.ok ? "반영했습니다." : "반영하지 못했습니다.");
    if (res.ok) setTicker(await adminGet(tickerApi));
  }

  const holdItems = holdQueue?.ok ? asRecordList(holdQueue.data) : null;
  const pendingItems = pendingKrw?.ok ? asRecordList(pendingKrw.data) : null;
  const approvedItems = approvedKrw?.ok ? asRecordList(approvedKrw.data) : null;
  const rejectedItems = rejectedKrw?.ok ? asRecordList(rejectedKrw.data) : null;
  const financeBuckets =
    finance?.ok && finance.data && typeof finance.data === "object"
      ? asRecordList((finance.data as { buckets?: unknown }).buckets)
      : null;
  const whaleItems = whaleOpps?.ok ? asRecordList(whaleOpps.data) : null;
  const surface =
    ticker?.ok && ticker.data.publicSurface && typeof ticker.data.publicSurface === "object"
      ? (ticker.data.publicSurface as Record<string, unknown>)
      : null;
  const surfaceEvents = surface ? asRecordList(surface.events) : null;

  return (
    <main
      className="p-6 text-lux-text"
      data-admin-growth-tab={tab}
      data-testid="admin-growth"
      data-forbid="fake-growth-truth"
    >
      <h1 className="text-xl font-semibold">이벤트·프로모션</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        있는 운영 상태만 봅니다. 광고 성과·ROAS는 아직 없습니다.
      </p>
      <nav
        className="mt-4 flex flex-wrap gap-2 text-sm"
        data-testid="growth-tabs"
      >
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/growth?tab=${t}`}
            data-tab={t}
            className={
              tab === t
                ? "rounded px-2 py-1 bg-lux-elevated text-lux-accent"
                : "rounded px-2 py-1 text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "simulation" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-simulation-panel"
          data-surface="admin-growth-simulation"
          data-latest-api={simLatestApi}
          data-growth-gate-api={simGrowthGateApi}
          data-growth-enabled-api={growthEnabledApi}
        >
          <p className="text-sm text-lux-text-muted">
            최근 시뮬레이션과 성장 켜기 조건만 표시합니다. KPI를 지어내지 않습니다.
          </p>
          {!latest || !gate || !enabled ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : (
            <>
              {!latest.ok ? (
                latest.failure.kind === "not_found" ? (
                  <p className="text-sm text-lux-text-muted">
                    최근 시뮬레이션이 없습니다.
                  </p>
                ) : (
                  <AdminFetchNote failure={latest.failure} />
                )
              ) : (
                <div className="rounded border border-lux-border p-3 text-sm space-y-1">
                  <p>
                    최근 결과{" "}
                    <AdminTruth
                      value={
                        typeof latest.data.overallPass === "boolean"
                          ? latest.data.overallPass
                            ? "통과"
                            : "실패"
                          : null
                      }
                    />
                  </p>
                  <p>
                    시각 <AdminTruth value={readText(latest.data.asOf)} />
                  </p>
                </div>
              )}
              {!gate.ok ? (
                <AdminFetchNote failure={gate.failure} />
              ) : (
                <div className="rounded border border-lux-border p-3 text-sm space-y-1">
                  <p>
                    성장 켜기 가능{" "}
                    <AdminTruth
                      value={
                        typeof gate.data.allowed === "boolean"
                          ? gate.data.allowed
                            ? "가능"
                            : "불가"
                          : null
                      }
                    />
                  </p>
                </div>
              )}
              {!enabled.ok ? (
                <AdminFetchNote failure={enabled.failure} />
              ) : (
                <div
                  className="rounded border border-lux-border p-3 text-sm space-y-2"
                  data-field="growth-enabled"
                  data-gate="admin.growth.enabled"
                >
                  <p>
                    성장 기능{" "}
                    <AdminTruth
                      value={
                        typeof enabled.data.enabled === "boolean"
                          ? enabled.data.enabled
                            ? "켜짐"
                            : "꺼짐"
                          : null
                      }
                    />
                  </p>
                  <label className="block text-sm" htmlFor="growth-enable-reason">
                    변경 사유
                  </label>
                  <textarea
                    id="growth-enable-reason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded bg-lux-elevated px-2 py-1"
                      onClick={() => void setGrowthOn(true)}
                    >
                      켜기
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-lux-text-muted"
                      onClick={() => void setGrowthOn(false)}
                    >
                      끄기
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : tab === "referral" ? (
        <section
          className="mt-6 space-y-3"
          data-testid="growth-referral-panel"
          data-program-api={programApi}
          data-pool-api={poolApi}
          data-hold-queue-api={holdQueueApi}
          data-top-up-api={topUpApi}
          data-accrual-halt-api={accrualHaltApi}
          data-rewards-enabled-default="false"
          data-invite-cap-ui="0"
          data-forbid-monthly-invite-cap="true"
        >
          <p className="text-sm text-lux-text-muted">
            초대 프로그램·풀만 봅니다. 월간 초대 인원 제한 입력칸은 없습니다.
          </p>
          {!program || !pool || !holdQueue ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : (
            <>
              {!program.ok ? (
                <AdminFetchNote failure={program.failure} />
              ) : (
                <div className="rounded border border-lux-border p-3 text-sm space-y-1">
                  <p>
                    프로그램{" "}
                    <AdminTruth
                      value={
                        typeof program.data.enabled === "boolean"
                          ? program.data.enabled
                            ? "켜짐"
                            : "꺼짐"
                          : null
                      }
                    />
                  </p>
                  <p>
                    보상{" "}
                    <AdminTruth
                      value={
                        typeof program.data.rewardsEnabled === "boolean"
                          ? program.data.rewardsEnabled
                            ? "켜짐"
                            : "꺼짐"
                          : null
                      }
                    />
                  </p>
                  <p>
                    적립 정지{" "}
                    <AdminTruth
                      value={
                        typeof program.data.accrualHalted === "boolean"
                          ? program.data.accrualHalted
                            ? "정지"
                            : "진행"
                          : null
                      }
                    />
                  </p>
                  <p>
                    피초대 최소 입금{" "}
                    <AdminTruth
                      value={readAmount(program.data.minRefereeDepositUsdt)}
                    />
                  </p>
                </div>
              )}
              {!pool.ok ? (
                <AdminFetchNote failure={pool.failure} />
              ) : (
                <div className="rounded border border-lux-border p-3 text-sm">
                  <p>
                    초대 풀{" "}
                    <AdminTruth
                      value={readAmount(pool.data.promoPoolBalanceUsdt)}
                    />
                  </p>
                </div>
              )}
              <label className="block text-sm" htmlFor="growth-ref-reason">
                결정 사유
              </label>
              <textarea
                id="growth-ref-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              />
              <label className="mt-2 block text-sm" htmlFor="growth-ref-topup">
                풀에 넣을 금액
              </label>
              <input
                id="growth-ref-topup"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-lux-elevated px-2 py-1 text-sm"
                  onClick={() => void topUpPool()}
                >
                  풀에 넣기
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-sm"
                  onClick={() => void haltAccrual(true)}
                >
                  적립 멈추기
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-sm text-lux-text-muted"
                  onClick={() => void haltAccrual(false)}
                >
                  적립 다시 켜기
                </button>
              </div>
              {!holdQueue.ok ? (
                <AdminFetchNote failure={holdQueue.failure} />
              ) : holdItems == null ? (
                <AdminTruth value={null} testId="growth-hold-queue" />
              ) : holdItems.length === 0 ? (
                <p className="text-sm text-lux-text-muted">보류 항목이 없습니다.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {holdItems.map((row, idx) => (
                    <li key={readText(row.id) ?? String(idx)}>
                      <AdminTruth value={readText(row.status)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ) : tab === "content" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-content-panel"
          data-tax-disclaimer-locked="true"
          data-admin-override="false"
          data-forbid="fake-content-truth"
        >
          <h2 className="text-base font-medium">{T.admin.contentTab}</h2>
          <p className="text-sm text-lux-text-muted">
            {T.admin.taxDisclaimerLockedHint}
          </p>
          <div
            data-testid="admin-tax-disclaimer-lock"
            data-editable="false"
            aria-readonly="true"
          >
            <p className="mb-2 text-xs font-medium text-lux-warning">
              {T.admin.taxDisclaimerLocked}
            </p>
            <TaxDisclaimerBlock />
          </div>
          <article
            className="rounded border border-lux-border p-3"
            data-metric="content-performance"
            data-truth="unavailable"
          >
            <h3 className="text-sm text-lux-text-muted">콘텐츠 성과</h3>
            <p className="mt-2">
              <AdminTruth value={null} testId="growth-content-performance" />
            </p>
            <p className="mt-1 text-xs text-lux-text-muted">
              노출·반응·전환 집계 경로가 없습니다. 광고 연동은 아직 없습니다.
            </p>
          </article>
        </section>
      ) : tab === "deposit" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-deposit-panel"
          data-forbid="fake-deposit-growth-truth"
          data-pending-api="/api/v1/admin/wallet/krw-deposit-requests?status=pending"
          data-approved-api="/api/v1/admin/wallet/krw-deposit-requests?status=approved"
          data-rejected-api="/api/v1/admin/wallet/krw-deposit-requests?status=rejected"
          data-ledger-api={financeApi}
        >
          <p className="text-sm text-lux-text-muted">
            성공 입금은 승인된 원화 요청과 원장 입금만 셉니다. 대기·거절·잔액 추정은
            성공이 아닙니다.
          </p>
          <p className="text-xs text-lux-text-muted">
            승인/거절은{" "}
            <a href="/admin/wallet?tab=krw-pending" className="underline">
              입출금 대기
            </a>
            에서 합니다.
          </p>
          {!pendingKrw || !approvedKrw || !rejectedKrw || !finance ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : (
            <>
              <DepositStatusList
                title="대기"
                result={pendingKrw}
                items={pendingItems}
                testId="growth-deposit-pending"
              />
              <DepositStatusList
                title="승인(성공)"
                result={approvedKrw}
                items={approvedItems}
                testId="growth-deposit-approved"
                success
              />
              <DepositStatusList
                title="거절"
                result={rejectedKrw}
                items={rejectedItems}
                testId="growth-deposit-rejected"
              />
              <div className="rounded border border-lux-border p-3">
                <h3 className="text-sm font-medium">원장 입금(정산 반영)</h3>
                {!finance.ok ? (
                  <AdminFetchNote failure={finance.failure} />
                ) : financeBuckets == null ? (
                  <AdminTruth value={null} testId="growth-deposit-ledger" />
                ) : financeBuckets.length === 0 ? (
                  <p className="mt-2 text-sm text-lux-text-muted">
                    원장 입금이 없습니다.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {financeBuckets.map((row, idx) => (
                      <li key={readText(row.period) ?? String(idx)}>
                        <AdminTruth value={readText(row.period)} /> · 입금{" "}
                        <AdminTruth value={readAmount(row.depositUsdt)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <article
                className="rounded border border-lux-border p-3"
                data-metric="deposit-conversion"
                data-truth="unavailable"
              >
                <h3 className="text-sm text-lux-text-muted">입금 전환율</h3>
                <p className="mt-2">
                  <AdminTruth value={null} testId="growth-deposit-conversion" />
                </p>
                <p className="mt-1 text-xs text-lux-text-muted">
                  전환율 오너가 없습니다. 대기/거절을 성공으로 나누지 않습니다.
                </p>
              </article>
            </>
          )}
        </section>
      ) : tab === "ticker" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-ticker-panel"
          data-ticker-api={tickerApi}
          data-forbid="fake-ticker-truth"
        >
          <p className="text-sm text-lux-text-muted">
            시세 띠 설정은 기존 설정 테이블만 바꿉니다. 성과 숫자는 만들지 않습니다.
          </p>
          {!ticker ? (
            <p className="text-sm text-lux-text-muted">불러오는 중</p>
          ) : !ticker.ok ? (
            <AdminFetchNote failure={ticker.failure} />
          ) : (
            <>
              <div className="rounded border border-lux-border p-3 text-sm space-y-1">
                <p>
                  띠{" "}
                  <AdminTruth
                    value={
                      readText(ticker.data.tickerMode)
                        ? TICKER_MODE_LABEL[String(ticker.data.tickerMode)] ??
                          readText(ticker.data.tickerMode)
                        : null
                    }
                  />
                </p>
                <p>
                  합계{" "}
                  <AdminTruth
                    value={
                      readText(ticker.data.counterMode)
                        ? COUNTER_MODE_LABEL[String(ticker.data.counterMode)] ??
                          readText(ticker.data.counterMode)
                        : null
                    }
                  />
                </p>
                <p>
                  오늘 정산 건수{" "}
                  <AdminTruth
                    value={
                      surface && typeof surface.ledgerTotal === "number"
                        ? String(surface.ledgerTotal)
                        : null
                    }
                  />
                </p>
              </div>
              <label className="block text-sm" htmlFor="growth-ticker-mode">
                띠 모드
              </label>
              <select
                id="growth-ticker-mode"
                value={tickerMode}
                onChange={(e) => setTickerMode(e.target.value)}
                className="mt-1 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              >
                {Object.keys(TICKER_MODE_LABEL).map((m) => (
                  <option key={m} value={m}>
                    {TICKER_MODE_LABEL[m]}
                  </option>
                ))}
              </select>
              <label className="mt-2 block text-sm" htmlFor="growth-counter-mode">
                합계 모드
              </label>
              <select
                id="growth-counter-mode"
                value={counterMode}
                onChange={(e) => setCounterMode(e.target.value)}
                className="mt-1 rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              >
                {Object.keys(COUNTER_MODE_LABEL).map((m) => (
                  <option key={m} value={m}>
                    {COUNTER_MODE_LABEL[m]}
                  </option>
                ))}
              </select>
              <label className="mt-2 block text-sm" htmlFor="growth-ticker-reason">
                변경 사유
              </label>
              <textarea
                id="growth-ticker-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1 w-full max-w-md rounded border border-lux-border bg-lux-bg px-2 py-1 text-sm"
              />
              <button
                type="button"
                className="rounded bg-lux-elevated px-2 py-1 text-sm"
                onClick={() => void saveTicker()}
              >
                저장
              </button>
              {surfaceEvents == null ? (
                <AdminTruth value={null} testId="growth-ticker-events" />
              ) : surfaceEvents.length === 0 ? (
                <p className="text-sm text-lux-text-muted">최근 정산 알림이 없습니다.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {surfaceEvents.map((row, idx) => (
                    <li key={readText(row.id) ?? String(idx)}>
                      <AdminTruth value={readText(row.displayLabel)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ) : tab === "whale" ? (
        <section
          className="mt-6 space-y-4"
          data-testid="growth-whale-panel"
          data-forbid="fake-whale-truth"
          data-whale-api={whaleOppApi}
        >
          <p className="text-sm text-lux-text-muted">
            회원 가치·평생가치 분류 오너는 없습니다. 기존 기회 자본대 웨일만 봅니다.
          </p>
          <article
            className="rounded border border-lux-border p-3"
            data-metric="whale-users"
            data-truth="unavailable"
          >
            <h3 className="text-sm text-lux-text-muted">웨일 회원</h3>
            <p className="mt-2">
              <AdminTruth value={null} testId="growth-whale-users" />
            </p>
            <p className="mt-1 text-xs text-lux-text-muted">
              회원 가치·거래량·위험 라벨을 만들지 않습니다.
            </p>
          </article>
          <div>
            <h3 className="text-sm font-medium">기회 자본대 · 웨일(10만~)</h3>
            {!whaleOpps ? (
              <p className="mt-2 text-sm text-lux-text-muted">불러오는 중</p>
            ) : !whaleOpps.ok ? (
              <AdminFetchNote failure={whaleOpps.failure} />
            ) : whaleItems == null ? (
              <AdminTruth value={null} testId="growth-whale-opportunities" />
            ) : whaleItems.length === 0 ? (
              <p className="mt-2 text-sm text-lux-text-muted">
                웨일 자본대 기회가 없습니다.
              </p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {whaleItems.map((row, idx) => (
                  <li key={readText(row.id) ?? String(idx)}>
                    <AdminTruth value={readText(row.titleKo) ?? readText(row.id)} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-lux-text-muted">
              <a href="/admin/opportunities?capitalBand=whale" className="underline">
                수익 기회에서 보기
              </a>
            </p>
          </div>
        </section>
      ) : tab === "campaigns" ? (
        <section
          className="mt-6"
          data-testid="growth-campaigns-panel"
          data-forbid="fake-roas"
          data-post-deferred="POST-006"
        >
          <article
            className="rounded border border-lux-border p-3"
            data-metric="roas"
            data-truth="unavailable"
          >
            <h2 className="text-sm font-medium">캠페인 성과</h2>
            <p className="mt-2">
              <AdminTruth value={null} testId="growth-roas" />
            </p>
            <p className="mt-1 text-xs text-lux-text-muted">
              광고 성과·ROAS·유입 귀속은 아직 없습니다.
            </p>
          </article>
        </section>
      ) : (
        <section className="mt-6" data-testid={`growth-${tab}-panel`}>
          <article
            className="rounded border border-lux-border p-3"
            data-truth="unavailable"
          >
            <h2 className="text-sm font-medium">{TAB_LABEL[tab]}</h2>
            <p className="mt-2">
              <AdminTruth value={null} testId={`growth-${tab}-truth`} />
            </p>
            <p className="mt-1 text-xs text-lux-text-muted">
              이 탭의 운영 목록 경로가 없습니다. 숫자를 만들지 않습니다.
            </p>
          </article>
        </section>
      )}

      {actionNote ? (
        <p className="mt-4 text-sm text-lux-text-muted">{actionNote}</p>
      ) : null}
    </main>
  );
}

function DepositStatusList({
  title,
  result,
  items,
  testId,
  success,
}: {
  title: string;
  result: AdminResult<unknown>;
  items: Record<string, unknown>[] | null;
  testId: string;
  success?: boolean;
}) {
  return (
    <div
      className="rounded border border-lux-border p-3"
      data-success-only={success ? "true" : "false"}
    >
      <h3 className="text-sm font-medium">{title}</h3>
      {!result.ok ? (
        <AdminFetchNote failure={result.failure} />
      ) : items == null ? (
        <AdminTruth value={null} testId={testId} />
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-lux-text-muted">해당 상태 요청이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm" data-testid={testId}>
          {items.map((row, idx) => (
            <li key={readText(row.id) ?? String(idx)}>
              상태{" "}
              <AdminTruth
                value={
                  readText(row.status)
                    ? KRW_STATUS_LABEL[String(row.status)] ?? readText(row.status)
                    : null
                }
              />
              {success ? (
                <>
                  {" "}
                  · 회원 <AdminTruth value={readText(row.userId)} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <GrowthContent />
    </SearchParamsBoundary>
  );
}
