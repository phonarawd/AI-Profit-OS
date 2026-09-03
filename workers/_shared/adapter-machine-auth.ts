export type AdapterMachineAuthEnv = { ADAPTER_INGEST_TOKEN?: string };

function configuredToken(env: AdapterMachineAuthEnv): string {
  return typeof env.ADAPTER_INGEST_TOKEN === "string" ? env.ADAPTER_INGEST_TOKEN : "";
}

export function authorizeManualAdapterTick(
  request: Request,
  env: AdapterMachineAuthEnv,
): Response | null {
  const expected = configuredToken(env);
  if (!expected) {
    return Response.json({ ok: false, error: "ADAPTER_INGEST_TOKEN_UNAVAILABLE" }, { status: 503 });
  }
  const got = request.headers.get("x-adapter-token") ?? "";
  if (got !== expected) {
    return Response.json({ ok: false, error: "ADAPTER_INGEST_TOKEN_INVALID" }, { status: 401 });
  }
  return null;
}

export function requireAdapterIngestHeaders(
  env: AdapterMachineAuthEnv,
): Record<string, string> {
  const token = configuredToken(env);
  if (!token) throw new Error("ADAPTER_INGEST_TOKEN_UNAVAILABLE");
  return { "content-type": "application/json", "x-adapter-token": token };
}
