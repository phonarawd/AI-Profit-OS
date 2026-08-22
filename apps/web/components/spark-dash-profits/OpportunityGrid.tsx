import Link from "next/link";
import type { ReactNode } from "react";
import { OpportunityCard } from "./OpportunityCard";
import type { ProfitsOpportunity, ProfitsViewState } from "./types";

function OpportunitySkeleton() {
  return (
    <div
      className="sdp-grid"
      data-sdp="loading"
      role="status"
      aria-busy="true"
      aria-label="기회를 불러오는 중"
    >
      <div className="sdp-skel is-featured" />
      <div className="sdp-skel" />
      <div className="sdp-skel" />
      <div className="sdp-skel" />
    </div>
  );
}

function FeedMessage({
  kind,
  children,
}: {
  kind: "empty" | "error" | "unauthorized" | "filter-empty";
  children: ReactNode;
}) {
  return (
    <div className="sdp-empty" data-sdp={kind}>
      {children}
    </div>
  );
}

export function OpportunityGrid({
  items,
  viewState,
  filterEmpty,
}: {
  items: ProfitsOpportunity[];
  viewState: ProfitsViewState;
  filterEmpty: boolean;
}) {
  if (viewState === "LOADING") {
    return <OpportunitySkeleton />;
  }

  if (viewState === "ERROR") {
    return (
      <FeedMessage kind="error">
        <p>기회를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
      </FeedMessage>
    );
  }

  if (viewState === "UNAUTHORIZED") {
    return (
      <FeedMessage kind="unauthorized">
        <p>로그인하면 확인할 수 있는 기회를 보여드려요.</p>
        <Link className="sdp-empty-action" href="/auth/login">
          로그인
        </Link>
      </FeedMessage>
    );
  }

  if (viewState === "EMPTY") {
    return (
      <FeedMessage kind="empty">
        <p>지금 확인할 수 있는 기회가 아직 없어요.</p>
        <p>새로운 기회가 생기면 여기에서 확인할 수 있어요.</p>
        <Link className="sdp-empty-action" href="/" data-sdp-empty-action="home">
          홈으로
        </Link>
      </FeedMessage>
    );
  }

  if (filterEmpty) {
    return (
      <FeedMessage kind="filter-empty">
        <p>검색한 조건에 맞는 기회가 없어요.</p>
      </FeedMessage>
    );
  }

  return (
    <div className="sdp-grid" data-sdp="grid">
      {items.map((item) => (
        <OpportunityCard key={item.id} item={item} />
      ))}
    </div>
  );
}
