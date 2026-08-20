import Link from "next/link";
import { OpportunityMedia, PartnerName } from "./OpportunityMedia";
import { OpportunityMetrics } from "./OpportunityMetrics";
import type { ProfitsOpportunity } from "./types";

export function OpportunityCard({ item }: { item: ProfitsOpportunity }) {
  return (
    <Link
      href={item.href}
      className={`sdp-card${item.featured ? " is-featured" : ""}`}
      data-sdp="card"
    >
      {item.featured ? <OpportunityMedia item={item} featured /> : null}
      <div className="sdp-card-body">
        <div className="sdp-card-id">
          <PartnerName kind={item.partnerKind} name={item.partner} />
          {item.official === true ? (
            <span className="sdp-official">공식 파트너</span>
          ) : null}
        </div>
        <h3 className="sdp-card-title">{item.title}</h3>
        {item.featured ? null : <OpportunityMedia item={item} />}
        <OpportunityMetrics item={item} />
        <div className="sdp-card-foot">
          <p className={`sdp-status${item.joinable ? " is-on" : ""}`}>
            <span className="dot" />
            {item.statusLabel}
          </p>
          <span className="sdp-more">상세 보기 →</span>
        </div>
      </div>
    </Link>
  );
}
