"use client";

import { logoutAuth } from "@aipo/sdk/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGate } from "./AuthGate";
import { accountUserMessage } from "./account-messages";
import { useAccountSession } from "./useAccountSession";

const LINKS = [
  { href: "/me/invite", label: "초대" },
  { href: "/me/inbox", label: "알림" },
  { href: "/me/kyc", label: "본인 확인" },
  { href: "/me/settings", label: "설정" },
  { href: "/me/support", label: "고객지원" },
  { href: "/me/guide/usdt", label: "안내" },
  { href: "/me/legal", label: "약관" },
] as const;

export function ProfileClient() {
  const router = useRouter();
  const session = useAccountSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onLogout() {
    setBusy(true);
    setErr(null);
    try {
      await logoutAuth({ apiBase: "" });
      router.replace("/auth/login");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-account-hub="profile">
      <AuthGate state={session}>
        <p>로그인되어 있어요.</p>
        <nav>
          {LINKS.map((item) => (
            <p key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </p>
          ))}
        </nav>
        <p>
          <button type="button" onClick={() => void onLogout()} disabled={busy}>
            로그아웃
          </button>
        </p>
        {err ? <p>{err}</p> : null}
      </AuthGate>
    </section>
  );
}
