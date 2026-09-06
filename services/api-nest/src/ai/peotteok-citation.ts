export type PeotteokCitation = {
  kind: "opportunity" | "ledger";
  id?: string;
  deepLink?: string | null;
  asOf: string;
};

export function citationsFromFacts(
  facts: Array<{ source?: string; payload?: Record<string, unknown> }>,
  asOf: string,
): PeotteokCitation[] {
  const out: PeotteokCitation[] = [];
  for (const fact of facts) {
    const payload = fact.payload || {};
    if (fact.source === "opportunity") {
      const id =
        payload.opportunityId != null ? String(payload.opportunityId).trim() : "";
      if (id) {
        out.push({
          kind: "opportunity",
          id,
          deepLink:
            typeof payload.deepLink === "string" && payload.deepLink
              ? payload.deepLink
              : "/profits/" + id,
          asOf,
        });
      }
    }
    if (fact.source === "ledger") {
      out.push({ kind: "ledger", asOf });
    }
  }
  return out;
}

export function titleFromUserText(text: string): string {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "\uC0C8 \uB300\uD654";
  return t.length > 40 ? t.slice(0, 40) + "\u2026" : t;
}
