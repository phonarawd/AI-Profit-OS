export type GrowthPublicSurfaceResponse = {
  tickerMode: "off" | "live" | "demo" | "hybrid";
  counterMode: "off" | "ledger" | "demo" | "blended";
  ledgerTotal: number;
  events: Array<{
    id: string;
    displayLabel: string;
    amountKrwText: string;
    templateKey: "just_settled" | "just_reflected" | "participant_amt";
    at: string;
  }>;
  asOf: string;
};

export type GrowthRequestOpts = {
  apiBase?: string;
  signal?: AbortSignal;
};
