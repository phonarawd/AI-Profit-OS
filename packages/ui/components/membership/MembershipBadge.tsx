"use client";

import {
  getMembershipBadge,
  membershipBadgeSrc,
  type MembershipGradeId,
} from "../../brand/membership";
import { T } from "../../copy/ko";

export type MembershipBadgeProps = {
  grade: MembershipGradeId | string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

const SIZE_PX = { sm: 28, md: 40, lg: 56 } as const;

/**
 * UI §5.9.2c — Brand Kit SVG 주 배지 · emoji는 a11y 라벨만
 */
export function MembershipBadge({
  grade,
  size = "md",
  showLabel = false,
  className = "",
}: MembershipBadgeProps) {
  const entry = getMembershipBadge(grade);
  const id = (entry?.id ?? "sprout") as MembershipGradeId;
  const labelKo =
    entry?.labelKo ??
    T.membership.labels[id as keyof typeof T.membership.labels] ??
    grade;
  const px = SIZE_PX[size];

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`.trim()}
      data-testid="membership-badge"
      data-membership-grade={id}
      data-brand-svg="true"
    >
      <img
        src={membershipBadgeSrc(id)}
        alt=""
        width={px}
        height={px}
        className="shrink-0"
        aria-hidden
      />
      <span className="sr-only">{labelKo}</span>
      {showLabel ? (
        <span className="text-sm font-medium text-pd-text" aria-hidden>
          {labelKo}
        </span>
      ) : null}
    </span>
  );
}
