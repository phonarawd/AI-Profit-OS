import { isUuid } from "./admin-truth";

export type AdminCommandTarget = {
  href: string;
  kind: "user" | "users-search" | "ledger" | "opportunity";
};

/** 전역 찾기: 있는 화면으로만 보낸다. 새 검색 API를 만들지 않는다. */
export function resolveAdminCommand(raw: string): AdminCommandTarget | null {
  const q = raw.trim();
  if (!q) return null;
  if (isUuid(q)) {
    return { href: `/admin/users/${q}`, kind: "user" };
  }
  if (/^opp[-_]/i.test(q) || /^opportunity/i.test(q)) {
    return {
      href: `/admin/opportunities`,
      kind: "opportunity",
    };
  }
  if (/^jrn[-_]/i.test(q) || /^journal/i.test(q)) {
    return { href: `/admin/ledger`, kind: "ledger" };
  }
  return {
    href: `/admin/users?search=${encodeURIComponent(q)}`,
    kind: "users-search",
  };
}
