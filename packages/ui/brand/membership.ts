/**
 * UI §5.9.2c — Membership badge accessors (Brand Kit SVG B안).
 * File SSOT = `assets/membership/manifest.json` (verify:membership-badge-assets).
 */

export type MembershipGradeId =
  | "sprout"
  | "entry"
  | "core"
  | "high"
  | "vip";

export type MembershipBadgeEntry = {
  id: MembershipGradeId;
  file: string;
  path: string;
  status: "ready";
  labelKo: string;
  displayOrder: number;
};

/** Keep in sync with assets/membership/manifest.json — CI enforces. */
export const MEMBERSHIP_BADGES: readonly MembershipBadgeEntry[] = [
  {
    id: "sprout",
    file: "sprout.svg",
    path: "assets/membership/sprout.svg",
    status: "ready",
    labelKo: "새싹",
    displayOrder: 1,
  },
  {
    id: "entry",
    file: "entry.svg",
    path: "assets/membership/entry.svg",
    status: "ready",
    labelKo: "입문",
    displayOrder: 2,
  },
  {
    id: "core",
    file: "core.svg",
    path: "assets/membership/core.svg",
    status: "ready",
    labelKo: "본격",
    displayOrder: 3,
  },
  {
    id: "high",
    file: "high.svg",
    path: "assets/membership/high.svg",
    status: "ready",
    labelKo: "고액",
    displayOrder: 4,
  },
  {
    id: "vip",
    file: "vip.svg",
    path: "assets/membership/vip.svg",
    status: "ready",
    labelKo: "VIP",
    displayOrder: 5,
  },
] as const;

const BY_ID = new Map(MEMBERSHIP_BADGES.map((b) => [b.id, b]));

export function getMembershipBadge(
  id: string | null | undefined,
): MembershipBadgeEntry | null {
  if (!id) return null;
  return BY_ID.get(id as MembershipGradeId) ?? null;
}

/** Public URL — same `/brand/{path}` convention as market partner logos. */
export function membershipBadgeSrc(id: MembershipGradeId): string {
  const entry = getMembershipBadge(id);
  return entry
    ? `/brand/${entry.path}`
    : `/brand/assets/membership/${id}.svg`;
}
