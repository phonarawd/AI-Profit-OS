export type ChainMachineAuthEnv = {
  CHAIN_WORKER_TICK_TOKEN?: string;
  WATCHER_INGEST_TOKEN?: string;
};

function configured(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function authorizeManualChainTick(
  request: Request,
  env: ChainMachineAuthEnv,
): Response | null {
  const expected = configured(env.CHAIN_WORKER_TICK_TOKEN);
  if (!expected) {
    return Response.json(
      { ok: false, error: "CHAIN_WORKER_TICK_TOKEN_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const got = request.headers.get("x-chain-worker-token") ?? "";
  if (got !== expected) {
    return Response.json(
      { ok: false, error: "CHAIN_WORKER_TICK_TOKEN_INVALID" },
      { status: 401 },
    );
  }
  return null;
}

export function requireWatcherIngestHeaders(
  env: ChainMachineAuthEnv,
): Record<string, string> {
  const token = configured(env.WATCHER_INGEST_TOKEN);
  if (!token) throw new Error("WATCHER_INGEST_TOKEN_UNAVAILABLE");
  return { "content-type": "application/json", "x-watcher-token": token };
}
