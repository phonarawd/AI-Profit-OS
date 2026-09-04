import type { ProfitsFilterKey, ProfitsSortKey } from "./types";

const FILTERS: { key: ProfitsFilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "joinable", label: "참여 가능" },
];

export function OpportunityToolbar({
  query,
  filter,
  sort,
  onQuery,
  onFilter,
}: {
  query: string;
  filter: ProfitsFilterKey;
  sort: ProfitsSortKey;
  onQuery: (value: string) => void;
  onFilter: (value: ProfitsFilterKey) => void;
}) {
  return (
    <div className="sdp-toolbar" data-sdp="toolbar">
      <label className="sdp-search">
        <span className="sdp-search-ico" aria-hidden>
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="8.6" cy="8.6" r="5.1" stroke="currentColor" strokeWidth="1.7" />
            <path d="M12.4 12.4 16.2 16.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          data-sdp="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onInput={(e) => onQuery(e.currentTarget.value)}
          placeholder="상품 또는 파트너를 찾아보세요"
          aria-label="기회 검색"
        />
      </label>
      <div className="sdp-filters" role="group" aria-label="기회 필터">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sdp-chip${filter === item.key ? " is-on" : ""}`}
            data-sdp-filter={item.key}
            onClick={() => onFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="sdp-sort" data-sdp="sort" aria-label="정렬 추천순">
        <span>추천순</span>
        {sort === "recommended" ? (
          <span className="chev" aria-hidden>
            ▾
          </span>
        ) : null}
      </p>
    </div>
  );
}
