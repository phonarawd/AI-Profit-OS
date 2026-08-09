"use client";

import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTradeExecution } from "@aipo/sdk/execution-stream";
import {
  AiProgressRoom,
  ExecutionSafeStop,
  ExecutionSuccessReceipt,
  type ExecutionUiState,
} from "@aipo/ui/components/execution";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

function previewState(
  tradeId: string,
  status: ExecutionUiState["status"],
  resultCode?: ExecutionUiState["resultCode"],
): ExecutionUiState {
  const stepIndex =
    status === "success" ? 4 : status === "safe_stop" ? 2 : 1;
  return {
    tradeId,
    opportunityId: "preview-opp",
    pricingVersion: 1,
    status,
    resultCode,
    stepIndex: stepIndex as 0 | 1 | 2 | 3 | 4,
    progressPct: status === "success" ? 100 : status === "safe_stop" ? 40 : 35,
    logLine:
      status === "requeue"
        ? "조건을 다시 맞추는 중이에요"
        : "시세 불러오는 중...",
    expectedProfitUsdt: "12.50",
    settledProfitUsdt: status === "success" ? "12.50" : undefined,
    asset: {
      id: "preview-asset",
      label: "시세 참고 상품",
      ref: "REF-001",
    },
  };
}

/**
 * §48 execute 3면 — AiProgressRoom · SuccessReceipt · SafeStop
 * Live = useTradeExecution (Phase0 polling · Phase1+ SSE swap in hook only)
 */
function ExecuteContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryState = searchParams.get("state") ?? "running";
  const queryResult = searchParams.get("result") ?? undefined;
  const emphasis =
    searchParams.get("cta") === "merge" ? "merge" : "profit_withdraw";

  const tradeId = typeof params.id === "string" ? params.id : undefined;

  const { state, transport, live } = useTradeExecution({
    tradeId,
    getAccessToken: () => null,
    enabled: Boolean(tradeId),
  });

  const status = (state?.status ?? queryState) as ExecutionUiState["status"];
  const resultCode = (state?.resultCode ??
    queryResult) as ExecutionUiState["resultCode"] | undefined;

  const viewState: ExecutionUiState = useMemo(() => {
    if (state) {
      return {
        tradeId: state.tradeId,
        opportunityId: state.opportunityId,
        pricingVersion: state.pricingVersion,
        status: state.status,
        resultCode: state.resultCode,
        stepIndex: state.stepIndex,
        progressPct: state.progressPct,
        logLine: state.logLine,
        expectedProfitUsdt: state.expectedProfitUsdt,
        settledProfitUsdt: state.settledProfitUsdt,
        asset: state.asset,
      };
    }
    return previewState(
      tradeId ?? "preview",
      status === "cancelled" || status === "failed" ? "safe_stop" : status,
      resultCode ??
        (status === "safe_stop" ? "PRICE_MOVED" : undefined),
    );
  }, [state, tradeId, status, resultCode]);

  const onCancel = useCallback(() => {
    /* POST /api/v1/trades/:id/cancel — session wiring */
  }, []);

  const isSuccess = viewState.status === "success";
  const isSafeStop =
    viewState.status === "safe_stop" ||
    viewState.status === "cancelled" ||
    viewState.status === "failed";
  const isRunning =
    viewState.status === "running" || viewState.status === "requeue";

  return (
    <main
      className="mx-auto max-w-lg p-6 text-lux-text"
      data-trade-id={tradeId}
      data-execution-state={viewState.status}
      data-execution-transport={state?.transport ?? transport}
      data-execution-live={live ? "1" : "0"}
    >
      {isSuccess ? (
        <ExecutionSuccessReceipt
          state={viewState}
          emphasis={emphasis}
          onMerge={() => {
            /* POST /api/v1/wallet/profit/merge — session wiring */
          }}
          onLater={() => {
            window.location.href = "/";
          }}
        />
      ) : null}

      {isSafeStop ? <ExecutionSafeStop state={viewState} /> : null}

      {isRunning ? (
        <AiProgressRoom state={viewState} onCancel={onCancel} />
      ) : null}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <ExecuteContent />
    </SearchParamsBoundary>
  );
}
