"use client";

import { fetchKycStatus, submitKyc, type KycStatusResponse } from "@aipo/sdk/wallet";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AuthGate } from "../AuthGate";
import { accountUserMessage, fileToBase64, toPhoneE164 } from "../account-messages";
import { useAccountSession } from "../useAccountSession";

function statusCopy(kyc: KycStatusResponse): string {
  if (kyc.kycStatus === "pending") return "확인하고 있어요. 출금은 아직 안 돼요.";
  if (kyc.kycStatus === "approved") return "출금할 수 있어요. 참여 자격과는 달라요.";
  if (kyc.kycStatus === "rejected") {
    return kyc.rejectReason
      ? `다시 제출해 주세요. ${kyc.rejectReason}`
      : "다시 제출해 주세요.";
  }
  return "출금 전에 본인 확인이 필요해요. 참여·입금은 막지 않아요.";
}

export function KycClient() {
  const session = useAccountSession();
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [legalName, setLegalName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [idDocType, setIdDocType] = useState("kr_id");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (session !== "auth") return;
    const ac = new AbortController();
    void fetchKycStatus({ apiBase: "", signal: ac.signal })
      .then(setKyc)
      .catch((caught) => setErr(accountUserMessage(caught)));
    return () => ac.abort();
  }, [session]);

  const canSubmit = kyc?.kycStatus === "none" || kyc?.kycStatus === "rejected";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idDoc) {
      setErr("신분증 사진을 넣어 주세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      await submitKyc(
        {
          legalName,
          phoneE164: toPhoneE164(phone),
          birthDate,
          idDocType,
          idDocBase64: await fileToBase64(idDoc),
          selfieBase64: selfie ? await fileToBase64(selfie) : undefined,
        },
        { apiBase: "" },
      );
      const next = await fetchKycStatus({ apiBase: "" });
      setKyc(next);
      setNote("접수를 보냈어요. 확인이 끝나면 출금할 수 있어요.");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-account-hub="kyc">
      <AuthGate state={session}>
        {kyc ? (
          <p data-kyc-status={kyc.kycStatus}>{statusCopy(kyc)}</p>
        ) : null}
        {canSubmit ? (
          <form onSubmit={(e) => void onSubmit(e)}>
            <label>
              이름
              <input
                name="legalName"
                autoComplete="name"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
              />
            </label>
            <label>
              휴대전화
              <input
                name="phoneE164"
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
              신분증 종류
              <select
                name="idDocType"
                value={idDocType}
                onChange={(e) => setIdDocType(e.target.value)}
              >
                <option value="kr_id">주민등록증</option>
                <option value="driver">운전면허</option>
                <option value="passport">여권</option>
              </select>
            </label>
            <label>
              신분증 사진
              <input
                type="file"
                name="idDoc"
                accept="image/*"
                onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
                required
              />
            </label>
            <label>
              얼굴 사진
              <input
                type="file"
                name="selfie"
                accept="image/*"
                onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" disabled={busy}>
              제출
            </button>
          </form>
        ) : null}
        <p>
          <Link href="/wallet">지갑</Link>
        </p>
        {err ? <p>{err}</p> : null}
        {note ? <p>{note}</p> : null}
      </AuthGate>
    </section>
  );
}
