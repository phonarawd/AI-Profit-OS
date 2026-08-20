"use client";

import {
  bindReferral,
  fetchReferralMe,
  shareReferral,
  type ReferralMe,
} from "@aipo/sdk/referral";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "../AuthGate";
import { accountUserMessage } from "../account-messages";
import { useAccountSession } from "../useAccountSession";

function stateCopy(me: ReferralMe): string {
  if (me.consumerState === "rewards_off") {
    return "지금은 보상 프로그램이 꺼져 있어요. 초대는 할 수 있어요.";
  }
  if (me.consumerState === "pool_wait") {
    return "잠시 대기 중이에요. 초대가 실패한 것은 아니에요.";
  }
  if (me.consumerState === "bound") {
    return "초대 코드가 연결되어 있어요.";
  }
  return "친구를 초대할 수 있어요.";
}

export function InviteClient() {
  const session = useAccountSession();
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (session !== "auth") return;
    const ac = new AbortController();
    void fetchReferralMe({ apiBase: "", signal: ac.signal })
      .then(setMe)
      .catch((caught) => setErr(accountUserMessage(caught)));
    return () => ac.abort();
  }, [session]);

  async function onBind(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await bindReferral({ referralCode: code }, { apiBase: "" });
      const next = await fetchReferralMe({ apiBase: "" });
      setMe(next);
      setNote("초대 코드를 연결했어요.");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await shareReferral({ apiBase: "" });
      const text = me?.myReferralCode
        ? `퍼뜩 초대 코드 ${me.myReferralCode}`
        : "퍼뜩 초대";
      if (me?.myReferralCode && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(me.myReferralCode);
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ text }).catch(() => {
          /* 공유 취소는 실패가 아님 */
        });
      }
      setNote(
        me?.myReferralCode
          ? "초대 코드를 복사했어요."
          : "공유를 기록했어요. 지금은 내 코드가 없어요.",
      );
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-account-hub="referral">
      <AuthGate state={session}>
        {me ? (
          <>
            <p data-referral-state={me.consumerState}>{stateCopy(me)}</p>
            <p>초대 수 제한은 없어요.</p>
            {me.myReferralCode ? <p>내 코드 {me.myReferralCode}</p> : null}
            <p>
              <button type="button" onClick={() => void onShare()} disabled={busy}>
                공유
              </button>
            </p>
            {me.bound ? null : (
              <form onSubmit={(e) => void onBind(e)}>
                <label>
                  받은 코드
                  <input
                    name="referralCode"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <button type="submit" disabled={busy}>
                  코드 연결
                </button>
              </form>
            )}
          </>
        ) : null}
        {err ? <p>{err}</p> : null}
        {note ? <p>{note}</p> : null}
      </AuthGate>
    </section>
  );
}
