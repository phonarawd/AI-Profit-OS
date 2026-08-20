"use client";

import { useMemo, useState } from "react";
import { OpportunityGrid } from "./OpportunityGrid";
import { OpportunityToolbar } from "./OpportunityToolbar";
import { ProfitsDiscoveryHeader } from "./ProfitsDiscoveryHeader";
import { ProfitsShell } from "./ProfitsShell";
import type { ProfitsDesktopModel, ProfitsFilterKey, ProfitsSortKey } from "./types";
import "./spark-dash-profits.css";

function filterItems(
  items: ProfitsDesktopModel["items"],
  query: string,
  filter: ProfitsFilterKey,
) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === "joinable" && !item.joinable) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) || item.partner.toLowerCase().includes(q)
    );
  });
}

export function ProfitsDesktop({ model }: { model: ProfitsDesktopModel }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ProfitsFilterKey>("all");
  const sort: ProfitsSortKey = "recommended";
  const visible = useMemo(
    () => filterItems(model.items, query, filter),
    [model.items, query, filter],
  );

  return (
    <ProfitsShell model={model}>
      <div className="sdp-canvas">
        <div className="sdp-stage">
          <ProfitsDiscoveryHeader />
          <OpportunityToolbar
            query={query}
            filter={filter}
            sort={sort}
            onQuery={setQuery}
            onFilter={setFilter}
          />
          <div className="sdp-meta">
            <div className="sdp-meta-left">
              <h2>확인 가능한 기회</h2>
              {model.viewState === "READY" && model.items.length > 0 ? (
                <p className="sdp-count">{visible.length}개의 기회</p>
              ) : null}
            </div>
            <p className="sdp-note">
              예상 값은 변동될 수 있으며 참여 전 상세 조건을 확인하세요.
            </p>
          </div>
          <OpportunityGrid
            items={visible}
            viewState={model.viewState}
            filterEmpty={
              model.viewState === "READY" && visible.length === 0
            }
          />
        </div>
      </div>
    </ProfitsShell>
  );
}
