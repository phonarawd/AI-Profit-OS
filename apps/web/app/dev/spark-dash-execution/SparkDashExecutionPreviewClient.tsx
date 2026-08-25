"use client";

import { useMemo, useState } from "react";
import type { TradeExecutionState } from "@aipo/sdk/execution-stream";
import {
  SparkDashExecutionExperience,
  type ExecutionLogEntry,
} from "../../../components/spark-dash-execution/execution-experience";

const STATES: ReadonlyArray<TradeExecutionState> = [
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "running",
    stepIndex: 0,
    progressPct: 12,
    logLine: "거래 조건을 확인하고 있어요.",
    expectedProfitUsdt: "284.00",
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "running",
    stepIndex: 1,
    progressPct: 38,
    logLine: "조건에 맞는 거래를 찾고 있어요.",
    expectedProfitUsdt: "284.00",
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "requeue",
    resultCode: "REQUEUE",
    stepIndex: 1,
    progressPct: 46,
    logLine: "더 좋은 조건을 찾기 위해 다시 확인하고 있어요.",
    expectedProfitUsdt: "284.00",
    rematchCount: 1,
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "running",
    stepIndex: 3,
    progressPct: 78,
    logLine: "결과를 확인하고 정산을 준비하고 있어요.",
    expectedProfitUsdt: "284.00",
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "success",
    resultCode: "MATCH_SUCCESS",
    stepIndex: 4,
    progressPct: 100,
    logLine: "정산 결과가 안전하게 반영됐어요.",
    expectedProfitUsdt: "284.00",
    settledProfitUsdt: "284.00",
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
  {
    tradeId: "TRD-DEV-VISUAL-001",
    opportunityId: "OPP-DEV-VISUAL-001",
    pricingVersion: 1,
    status: "safe_stop",
    resultCode: "BELOW_MIN_PROFIT",
    stepIndex: 2,
    progressPct: 54,
    logLine: "기준에 맞지 않아 원금을 지키는 방향으로 안전하게 멈췄어요.",
    expectedProfitUsdt: "284.00",
    asset: { id: "asset-dev", label: "Nike Air Force 1 '07", ref: "DEV-FIXTURE" },
  },
];

const LABELS = ["접수", "진행", "다시 확인", "정산 준비", "완료", "안전 중지"] as const;

function DemoMoney({ primary, secondary, positive = false }: { primary: string; secondary: string; positive?: boolean }) {
  return (
    <span className="sdx-demo-money" data-dev-fixture="true" data-positive={positive ? "true" : "false"}>
      <strong>{primary}</strong>
      <small>{secondary}</small>
    </span>
  );
}

export function SparkDashExecutionPreviewClient() {
  const [index, setIndex] = useState(1);
  const state = STATES[index];
  const logs = useMemo<ExecutionLogEntry[]>(() => {
    const now = Date.now();
    return STATES.slice(0, Math.max(1, index + 1)).map((item, logIndex) => ({
      id: `${item.status}-${logIndex}`,
      line: item.logLine ?? "상태를 확인했어요.",
      observedAt: new Date(now - (index - logIndex) * 17_000).toISOString(),
    }));
  }, [index]);

  return (
    <div className="sdx-preview-page">
      <div className="sdx-preview-toolbar" aria-label="개발 전용 실행 상태 미리보기">
        <div>
          <strong>DEV VISUAL FIXTURE</strong>
          <span>실제 거래 데이터가 아닌 UI 검증 전용 상태입니다.</span>
        </div>
        <div className="sdx-preview-tabs">
          {LABELS.map((label, tabIndex) => (
            <button
              type="button"
              key={label}
              data-active={tabIndex === index ? "true" : "false"}
              onClick={() => setIndex(tabIndex)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <SparkDashExecutionExperience
        state={state}
        transport="polling"
        live={!(["success", "safe_stop", "cancelled", "failed"] as string[]).includes(state.status)}
        logs={logs}
        summary={{
          marketplaceLabel: "eBay · DEV",
          title: state.asset.label,
          subtitle: "실제 서비스에서는 서버 거래 상태와 상품 데이터가 이 자리에 연결됩니다.",
          requiredDeposit: <DemoMoney primary="1,000.00 USDT" secondary="약 ₩1,380,000 · DEV" />,
          expectedProfit: <DemoMoney primary="+284.00 USDT" secondary="약 +₩393,620 · DEV" positive />,
          settledProfit: <DemoMoney primary="+284.00 USDT" secondary="약 +₩393,620 · DEV" positive />,
          profitRate: <span>28.4%</span>,
        }}
        onSafeStop={() => setIndex(5)}
        onRefresh={() => setIndex((current) => (current >= 4 ? 1 : current + 1))}
      />
    </div>
  );
}
