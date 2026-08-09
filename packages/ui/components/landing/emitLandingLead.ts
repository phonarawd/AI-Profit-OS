/**
 * §6.4c.1 G — UI Lead trigger emit only
 * Consent Owns = Infra packages/sdk/marketing · 미실장·false·unknown = emit 0
 */
export type LandingLeadConsentReader = {
  getConsentMarketing?: () => boolean | undefined;
  publishLead?: (payload?: { content_category?: string }) => void;
};

declare global {
  /** optional bridge when Infra sdk mounts (없으면 emit 0) */
  var __AIPO_MARKETING__: LandingLeadConsentReader | undefined;
}

export function emitLandingLeadIfConsented(): void {
  const bridge = globalThis.__AIPO_MARKETING__;
  if (!bridge || typeof bridge.getConsentMarketing !== "function") {
    return; // sdk 미실장 → emit 0
  }
  if (bridge.getConsentMarketing() !== true) {
    return; // false | undefined | unknown → emit 0
  }
  if (typeof bridge.publishLead === "function") {
    bridge.publishLead({ content_category: "market_data" });
  }
}
