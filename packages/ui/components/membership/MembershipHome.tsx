"use client";

import { useMemo, useState } from "react";
import { MEMBERSHIP_BADGES, type MembershipGradeId } from "../../brand/membership";
import { T } from "../../copy/ko";
import { TouchButton } from "../../primitives/Button";
import { MembershipBadge } from "./MembershipBadge";
import type { MembershipMeModel } from "./membership-types";

export type MembershipHomeProps = {
  data?: MembershipMeModel | null;
  className?: string;
};

function unlockLine(flag: string): string {
  const map = T.membership.aiUnlock as Record<string, string>;
  return map[flag] ?? "추가 안내";
}

function nextHint(data: MembershipMeModel): string {
  const ladder = data.ladder ?? [];
  const ids = ladder.map((r) => r.id);
  const idx = ids.indexOf(data.membership);
  if (idx < 0 || idx >= ids.length - 1) return T.membership.nextMax;
  const next = ladder[idx + 1];
  const parts: string[] = [];
  if (next.depositMinUsdt && next.depositMinUsdt !== "0") {
    parts.push(
      T.membership.nextDeposit.replace("{amount}", next.depositMinUsdt),
    );
  }
  if (next.successMin != null) {
    parts.push(
      T.membership.nextSuccess.replace("{n}", String(next.successMin)),
    );
  }
  if (parts.length === 0) return T.membership.nextMax;
  if (parts.length === 2) {
    return `${T.membership.nextHint}: ${parts[0]} · ${parts[1]} (${T.membership.nextEither})`;
  }
  return `${T.membership.nextHint}: ${parts[0]}`;
}

/**
 * UI §5.9.2c · §51.18a — Canon membership-home
 * fulfillRate = 표시전용 · Rule 입력 0 · Admin §9.8.10 pointer
 */
export function MembershipHome({
  data = null,
  className = "",
}: MembershipHomeProps) {
  const [ladderOpen, setLadderOpen] = useState(false);
  const grade = (data?.membership ?? "sprout") as MembershipGradeId;
  const labelKo =
    data?.labelKo ??
    T.membership.labels[grade as keyof typeof T.membership.labels] ??
    grade;
  const flags = data?.aiPerkFlags ?? [];
  const fulfill =
    data?.fulfillRate7d != null && Number.isFinite(data.fulfillRate7d)
      ? Math.round(Number(data.fulfillRate7d) * 100)
      : null;

  const ladder = useMemo(() => {
    if (data?.ladder?.length) return data.ladder;
    return MEMBERSHIP_BADGES.map((b) => ({
      id: b.id,
      labelKo: b.labelKo,
    }));
  }, [data?.ladder]);

  return (
    <main
      className={`text-pd-text ${className}`.trim()}
      data-testid="membership-home"
      data-canon="membership-home"
      data-fulfill-rate-rule-input="false"
      data-engine-pointer={T.membership.enginePointer}
      data-admin-pointer={T.membership.adminPointer}
    >
      <h1
        className="text-xl font-semibold"
        data-canon-block="title"
      >
        {T.membership.title}
      </h1>

      <section
        className="mt-6 flex items-center gap-3"
        data-canon-block="currentBadge"
        data-testid="membership-current"
      >
        <MembershipBadge grade={grade} size="lg" />
        <div>
          <p className="text-sm text-pd-text-muted">
            {T.membership.currentBadge}
          </p>
          <p className="text-lg font-semibold">{labelKo}</p>
        </div>
      </section>

      <p
        className="mt-3 text-sm text-pd-text-muted"
        data-canon-block="nextHint"
      >
        {data ? nextHint(data) : T.membership.nextHint}
      </p>

      <section
        className="mt-6 rounded-pd-md border border-pd-border bg-pd-surface p-4"
        data-canon-block="fulfillRate"
        data-testid="membership-fulfill-rate"
        data-read-only="true"
      >
        <p className="text-sm font-semibold">
          {T.membership.fulfillRateLabel}
        </p>
        <p className="mt-1 text-2xl font-semibold text-pd-accent">
          {fulfill != null ? `${fulfill}%` : "—"}
        </p>
        <p className="mt-1 text-xs text-pd-text-muted">
          {fulfill != null
            ? T.membership.fulfillRateHint
            : T.membership.fulfillRateEmpty}
        </p>
      </section>

      <section
        className="mt-6"
        data-canon-block="aiUnlocks"
        data-testid="membership-ai-unlocks"
      >
        <h2 className="text-sm font-semibold">
          {T.membership.aiUnlockList}
        </h2>
        {flags.length === 0 ? (
          <p className="mt-2 text-sm text-pd-text-muted">
            {T.membership.aiUnlockEmpty}
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {flags.map((f) => (
              <li key={f} data-ai-perk={f}>
                · {unlockLine(f)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2 text-sm">
        <p data-canon-block="notGuaranteed" data-testid="membership-not-guaranteed">
          {T.membership.notGuaranteed}
        </p>
        <p data-canon-block="highScarce" data-testid="membership-high-scarce">
          {T.membership.highScarce}
        </p>
      </section>

      <section className="mt-6" data-canon-block="ladder">
        <TouchButton
          variant="secondary"
          onClick={() => setLadderOpen((v) => !v)}
          data-testid="membership-ladder-toggle"
        >
          {ladderOpen ? T.membership.ladderCollapse : T.membership.ladderExpand}
        </TouchButton>
        {ladderOpen ? (
          <ul className="mt-3 space-y-3" data-testid="membership-ladder">
            {ladder.map((rung) => {
              const id = String(rung.id) as MembershipGradeId;
              const active = id === grade;
              return (
                <li
                  key={id}
                  className={[
                    "flex items-start gap-3 rounded-pd-md border p-3",
                    active
                      ? "border-pd-accent bg-pd-accent/10"
                      : "border-pd-border bg-pd-surface",
                  ].join(" ")}
                  data-ladder-grade={id}
                >
                  <MembershipBadge grade={id} size="sm" showLabel />
                  <div className="text-xs text-pd-text-muted">
                    {"dailyUserMatchCap" in rung &&
                    rung.dailyUserMatchCap != null ? (
                      <p>
                        {T.membership.dailyCapValue.replace(
                          "{n}",
                          String(rung.dailyUserMatchCap),
                        )}
                      </p>
                    ) : null}
                    {"maxCapitalBand" in rung && rung.maxCapitalBand ? (
                      <p>
                        {T.membership.bandLabel}: {rung.maxCapitalBand}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="mt-8" data-canon-block="faq">
        <ul className="space-y-3 text-sm">
          {T.membership.faq.map((item) => (
            <li key={item.q}>
              <p className="font-medium">Q. {item.q}</p>
              <p className="mt-1 text-pd-text-muted">A. {item.a}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
