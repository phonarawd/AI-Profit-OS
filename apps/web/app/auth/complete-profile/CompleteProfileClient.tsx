"use client";

import {
  fetchAuthSession,
  patchAuthProfile,
} from "@aipo/sdk/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authUserMessage, toPhoneE164 } from "../auth-messages";

export function CompleteProfileClient() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAuthSession({ apiBase: "", signal: ac.signal })
      .then((session) => {
        if (!session) {
          router.replace("/auth/login");
          return;
        }
        if (session.onboardingStage === "B_complete") {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        router.replace("/auth/login");
      });
    return () => ac.abort();
  }, [router]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await patchAuthProfile(
        {
          displayName,
          phoneE164: toPhoneE164(phone),
          birthDate,
          email,
          emailAlreadyKnown: false,
        },
        { apiBase: "" },
      );
      router.replace("/onboarding");
    } catch (caught) {
      setErr(authUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-auth="complete-profile" data-stage="B">
      <p>이름과 연락처를 알려 주세요. 출금 전에만 필요해요.</p>
      <form onSubmit={onSave}>
        <label>
          이름
          <input
            type="text"
            name="displayName"
            autoComplete="nickname"
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label>
          휴대전화
          <input
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
        <label>
          생년월일
          <input
            type="date"
            name="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </label>
        <label>
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          저장하고 이어가기
        </button>
      </form>
      {err ? <p>{err}</p> : null}
      <p>
        <Link href="/">홈으로</Link>
      </p>
    </section>
  );
}
