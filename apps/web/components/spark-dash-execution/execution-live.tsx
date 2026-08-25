"use client";

import { useCallback, useEffect, useState } from "react";
import { useTradeExecution } from "@aipo/sdk/execution-stream";
import {
  SparkDashExecutionExperience,
  type ExecutionLogEntry,
  type SparkDashExecutionSummary,
} from "./execution-experience";

const MAX_VISIBLE_LOGS = 24;

function sessionToken(): string | null {
  // Current production execution surface is same-origin and uses this auth boundary.
  return null;
}

export function SparkDashExecutionLive({
  tradeId,
  summary,
}: {
  tradeId: string;
  summary?: SparkDashExecutionSummary;
}) {
  const getAccessToken = useCallback(sessionToken, []);
  const { state, error, transport, live } = useTradeExecution({
    tradeId,
    apiBase: "",
    getAccessToken,
    enabled: tradeId.length > 0,
  });
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);

  useEffect(() => {
    const snapshot = state;
    if (!snapshot) return;
    const line = snapshot.logLine?.trim();
    if (!line) return;

    setLogs((current) => {
      if (current.at(-1)?.line === line) return current;
      const next: ExecutionLogEntry = {
        id: `${snapshot.tradeId}:${snapshot.stepIndex}:${snapshot.status}:${Date.now()}`,
        line,
        observedAt: new Date().toISOString(),
      };
      return [...current, next].slice(-MAX_VISIBLE_LOGS);
    });
  }, [state]);

  return (
    <SparkDashExecutionExperience
      state={state}
      transport={transport}
      live={live}
      logs={logs}
      summary={summary}
      errorMessage={error ? "연결이 불안정해요. 자동으로 다시 확인하고 있어요." : null}
    />
  );
}
