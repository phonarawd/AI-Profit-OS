/**
 * TronGrid API key authority = server env only.
 * Never read from deposit_config / Admin GET / audit payload.
 */

export const DEFAULT_TRONGRID_BASE_URL = "https://api.trongrid.io" as const;

export type TronGridAuth = {
  baseUrl: string;
  apiKey: string | null;
  source: "env" | "none";
};

export function resolveTronGridAuth(opts?: {
  env?: NodeJS.ProcessEnv;
  configBaseUrl?: string;
}): TronGridAuth {
  const env = opts?.env ?? process.env;
  const apiKey = (env.TRONGRID_API_KEY ?? "").trim() || null;
  const envBase = (env.TRONGRID_BASE_URL ?? "").trim();
  const cfgBase = (opts?.configBaseUrl ?? "").trim();
  const baseUrl = envBase || cfgBase || DEFAULT_TRONGRID_BASE_URL;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    source: apiKey ? "env" : "none",
  };
}

export function tronGridHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers["TRON-PRO-API-KEY"] = apiKey;
  }
  return headers;
}
