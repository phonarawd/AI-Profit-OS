"use client";

import { useEffect, useMemo, useState } from "react";
import { T } from "../../copy/ko";
import { TouchButton } from "../../primitives/Button";

export type InviteToneBand = "young" | "mid" | "senior";

export type InviteHomeProps = {
  /** prefs toneBand · 없으면 localStorage peotteok_tone_band → mid */
  toneBand?: InviteToneBand | null;
  /** Money API 표시값 — 하드코딩 금액 금지 · 숫자만 서버 전달 */
  inviteCode?: string;
  shareUrl?: string;
  /** true면 코드를 꾸며내지 않고 확인할 수 없음으로 둔다 */
  codeUnavailable?: boolean;
  stats?: {
    joined?: number;
    progress?: number;
    hold?: number;
    bonusProfitLabel?: string;
  } | null;
  onShare?: () => void;
  className?: string;
};

const TONE_KEY = "peotteok_tone_band";
const EXPLAIN_SEEN_KEY = "peotteok_invite_explain_seen";

/**
 * UI §5.9.1a — Canon invite-home · KR 20~70 설명 · 초대횟수∞
 * Money §51.5 pointer only (공식·금액 Owns=Money)
 */
export function InviteHome({
  toneBand: toneProp,
  inviteCode = "",
  shareUrl = "",
  codeUnavailable = false,
  stats,
  onShare,
  className = "",
}: InviteHomeProps) {
  const [tone, setTone] = useState<InviteToneBand>("mid");
  const [explainOpen, setExplainOpen] = useState(true);
  const [seniorStep, setSeniorStep] = useState(0);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (toneProp === "young" || toneProp === "mid" || toneProp === "senior") {
      setTone(toneProp);
      return;
    }
    try {
      const saved = localStorage.getItem(TONE_KEY) as InviteToneBand | null;
      if (saved === "young" || saved === "mid" || saved === "senior") {
        setTone(saved);
      }
    } catch {
      /* ignore */
    }
  }, [toneProp]);

  useEffect(() => {
    try {
      if (localStorage.getItem(EXPLAIN_SEEN_KEY) === "1") {
        setExplainOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleExplain() {
    const next = !explainOpen;
    setExplainOpen(next);
    if (!next) {
      try {
        localStorage.setItem(EXPLAIN_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  const missing = "확인할 수 없음";
  const displayCode =
    codeUnavailable || !inviteCode.trim() ? missing : inviteCode.trim();
  const displayLink = shareUrl.trim() || missing;

  const joined =
    stats && typeof stats.joined === "number" ? String(stats.joined) : missing;
  const progress =
    stats && typeof stats.progress === "number"
      ? String(stats.progress)
      : missing;
  const hold =
    stats && typeof stats.hold === "number" ? String(stats.hold) : missing;
  const bonusLabel =
    stats?.bonusProfitLabel?.trim() ? stats.bonusProfitLabel : missing;

  const oneLiner = useMemo(() => {
    if (tone === "young") return T.invite.young.oneLiner;
    if (tone === "senior") return T.invite.senior.oneLiner;
    return T.invite.mid.oneLiner;
  }, [tone]);

  const whenMoney =
    tone === "young" ? T.invite.young.whenMoney : T.invite.whenMoney;
  const noCap = tone === "young" ? T.invite.young.noCap : T.invite.noCap;

  async function copyText(kind: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  }

  function handleShare() {
    if (onShare) {
      onShare();
      return;
    }
    if (!shareUrl.trim()) return;
    void copyText(
      "link",
      shareUrl.startsWith("http")
        ? shareUrl
        : `${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}`,
    );
  }

  return (
    <main
      data-testid="invite-home"
      data-canon="invite-home"
      data-tone-band={tone}
      data-money-pointer={T.invite.moneyPointer}
      data-copy-owner="UI §5.9.1a"
      className={`space-y-5 text-pd-text ${className}`.trim()}
    >
      <header className="space-y-2">
        <h1
          className="text-xl font-semibold"
          data-canon-block="title"
          data-block="title"
        >
          {T.invite.title}
        </h1>
        <p
          className="text-sm text-pd-text-muted"
          data-canon-block="oneLiner"
          data-block="oneLiner"
        >
          {oneLiner}
        </p>
        <p
          className="text-sm font-medium text-pd-accent"
          data-canon-block="noCap"
          data-block="noCap"
        >
          {noCap}
        </p>
      </header>

      <section
        data-testid="invite-explain"
        data-explain-open={explainOpen ? "true" : "false"}
        className="rounded-pd-md border border-pd-border p-3"
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left text-sm font-medium"
          data-testid="invite-explain-toggle"
          aria-expanded={explainOpen}
          onClick={toggleExplain}
        >
          <span>{T.invite.explainToggle}</span>
          <span className="text-pd-text-muted">
            {explainOpen ? T.invite.explainHide : T.invite.explainToggle}
          </span>
        </button>

        {explainOpen ? (
          <div className="mt-3 space-y-3" data-testid="invite-explain-body">
            {tone === "young" ? (
              <ul
                className="space-y-1 text-sm"
                data-canon-block="steps3"
                data-block="steps3"
              >
                {T.invite.young.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}

            {tone === "mid" ? (
              <p
                className="text-sm text-pd-text-muted"
                data-canon-block="steps3"
                data-block="steps3"
              >
                {T.invite.mid.steps3}
              </p>
            ) : null}

            {tone === "senior" ? (
              <div
                className="space-y-2"
                data-canon-block="steps3"
                data-block="steps3"
              >
                <p className="text-base text-pd-text">
                  {T.invite.senior.stepLines[seniorStep]}
                </p>
                <TouchButton
                  variant="secondary"
                  className="w-full"
                  data-testid="invite-senior-next"
                  onClick={() =>
                    setSeniorStep((s) =>
                      s >= T.invite.senior.stepLines.length - 1 ? 0 : s + 1,
                    )
                  }
                >
                  {seniorStep >= T.invite.senior.stepLines.length - 1
                    ? T.invite.senior.done
                    : T.invite.senior.next}
                </TouchButton>
              </div>
            ) : null}

            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="whenMoney"
              data-block="whenMoney"
            >
              {whenMoney}
            </p>
            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="practiceNote"
              data-block="practiceNote"
            >
              {T.invite.practiceNote}
            </p>
            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="shareLimitNote"
              data-block="shareLimitNote"
            >
              {T.invite.shareLimitNote}
            </p>
            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="holdNote"
              data-block="holdNote"
            >
              {T.invite.holdNote}
            </p>
            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="poolWaitNote"
              data-block="poolWaitNote"
            >
              {T.invite.poolWaitNote}
            </p>
            <p
              className="text-sm text-pd-text-muted"
              data-canon-block="abuseNote"
              data-block="abuseNote"
            >
              {T.invite.abuseNote}
            </p>

            {tone === "mid" || tone === "senior" ? (
              <ul
                className="space-y-2 border-t border-pd-border pt-3"
                data-canon-block="faq"
                data-block="faq"
                data-testid="invite-faq"
              >
                {T.invite.faq.map((item) => (
                  <li key={item.q} className="text-sm">
                    <strong className="text-pd-text">Q. {item.q}</strong>
                    <p className="mt-0.5 text-pd-text-muted">A. {item.a}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        data-canon-block="stats"
        data-block="stats"
        data-testid="invite-stats"
        className="rounded-pd-md border border-pd-border p-3"
      >
        <h2 className="text-sm font-semibold">{T.invite.stats}</h2>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-pd-text-muted">{T.invite.statsJoined}</dt>
            <dd className="font-medium" data-stat="joined">
              {joined}
            </dd>
          </div>
          <div>
            <dt className="text-pd-text-muted">{T.invite.statsProgress}</dt>
            <dd className="font-medium" data-stat="progress">
              {progress}
            </dd>
          </div>
          <div>
            <dt className="text-pd-text-muted">{T.invite.statsHold}</dt>
            <dd className="font-medium" data-stat="hold">
              {hold}
            </dd>
          </div>
          <div>
            <dt className="text-pd-text-muted">{T.invite.statsBonus}</dt>
            <dd className="font-medium" data-stat="bonus">
              {bonusLabel}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2" data-testid="invite-share-block">
        <div data-canon-block="ctaCode" data-block="ctaCode">
          <p className="text-xs text-pd-text-muted">{T.invite.codeLabel}</p>
          <div className="mt-1 flex gap-2">
            <code className="flex-1 rounded-pd-md border border-pd-border bg-pd-elevated px-3 py-2 text-sm">
              {displayCode}
            </code>
            <TouchButton
              variant="secondary"
              data-testid="invite-copy-code"
              onClick={() =>
                inviteCode.trim() && copyText("code", inviteCode.trim())
              }
              disabled={!inviteCode.trim()}
            >
              {copied === "code" ? T.invite.copied : T.invite.ctaCode}
            </TouchButton>
          </div>
        </div>
        <div>
          <p className="text-xs text-pd-text-muted">{T.invite.linkLabel}</p>
          <p className="mt-1 break-all text-sm text-pd-text-muted">
            {displayLink}
          </p>
        </div>
        <TouchButton
          variant="primary"
          className="w-full"
          data-canon-block="ctaShare"
          data-block="ctaShare"
          data-testid="invite-cta-share"
          onClick={handleShare}
          disabled={!shareUrl.trim() && !onShare}
        >
          {copied === "link" ? T.invite.copied : T.invite.ctaShare}
        </TouchButton>
      </section>

      <p className="text-xs text-pd-text-muted" data-testid="invite-money-pointer">
        {T.invite.moneyPointer}
      </p>
    </main>
  );
}
