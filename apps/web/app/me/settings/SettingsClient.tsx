"use client";

import {
  DELETE_ACCOUNT_CONFIRM_PHRASE,
  deleteAuthAccount,
} from "@aipo/sdk/auth";
import {
  fetchNotificationPrefs,
  putNotificationPrefs,
  type NotificationPrefs,
} from "@aipo/sdk/inbox";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "../AuthGate";
import { accountUserMessage } from "../account-messages";
import { useAccountSession } from "../useAccountSession";

const PREF_LABELS: Array<{ key: keyof Omit<NotificationPrefs, "userId">; label: string }> = [
  { key: "master", label: "모든 알림" },
  { key: "opportunity", label: "기회" },
  { key: "wallet", label: "지갑" },
  { key: "notice", label: "안내" },
  { key: "campaign", label: "소식" },
  { key: "opsMessage", label: "운영 안내" },
  { key: "strategyMatch", label: "맞춤 알림" },
];

export function SettingsClient() {
  const router = useRouter();
  const session = useAccountSession();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [phrase, setPhrase] = useState("");
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (session !== "auth") return;
    const ac = new AbortController();
    void fetchNotificationPrefs({ apiBase: "", signal: ac.signal })
      .then(setPrefs)
      .catch((caught) => setErr(accountUserMessage(caught)));
    return () => ac.abort();
  }, [session]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const next = await putNotificationPrefs(
        {
          master: prefs.master,
          opportunity: prefs.opportunity,
          wallet: prefs.wallet,
          notice: prefs.notice,
          campaign: prefs.campaign,
          opsMessage: prefs.opsMessage,
          strategyMatch: prefs.strategyMatch,
        },
        { apiBase: "" },
      );
      setPrefs(next);
      setNote("저장했어요.");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await deleteAuthAccount(
        { confirmPhrase: phrase, confirmAgain: again },
        { apiBase: "" },
      );
      router.replace("/auth/login");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-account-hub="settings">
      <AuthGate state={session}>
        {prefs ? (
          <form onSubmit={(e) => void onSave(e)}>
            {PREF_LABELS.map((row) => (
              <label key={row.key}>
                <input
                  type="checkbox"
                  name={row.key}
                  checked={prefs[row.key]}
                  onChange={(e) =>
                    setPrefs({ ...prefs, [row.key]: e.target.checked })
                  }
                />
                {row.label}
              </label>
            ))}
            <button type="submit" disabled={busy}>
              알림 저장
            </button>
          </form>
        ) : null}
        <form onSubmit={(e) => void onDelete(e)}>
          <label>
            탈퇴하려면 아래에 그대로 적어 주세요
            <input
              name="confirmPhrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              autoComplete="off"
            />
          </label>
          <p>{DELETE_ACCOUNT_CONFIRM_PHRASE}</p>
          <label>
            <input
              type="checkbox"
              name="confirmAgain"
              checked={again}
              onChange={(e) => setAgain(e.target.checked)}
            />
            다시 확인했어요
          </label>
          <button type="submit" disabled={busy}>
            탈퇴
          </button>
        </form>
        {err ? <p>{err}</p> : null}
        {note ? <p>{note}</p> : null}
      </AuthGate>
    </section>
  );
}
