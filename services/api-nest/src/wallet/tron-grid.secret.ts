/** TronGrid API key = server env only. Never DB/Admin/audit. */
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
  const baseUrl = (
    (env.TRONGRID_BASE_URL ?? "").trim() ||
    (opts?.configBaseUrl ?? "").trim() ||
    DEFAULT_TRONGRID_BASE_URL
  ).replace(/\/$/, "");
  return { baseUrl, apiKey, source: apiKey ? "env" : "none" };
}

export function tronGridHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["TRON-PRO-API-KEY"] = apiKey;
  return headers;
}
