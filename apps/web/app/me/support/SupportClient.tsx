"use client";

import {
  createDepositDispute,
  newDepositDisputeIdempotencyKey,
} from "@aipo/sdk/wallet";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthGate } from "../AuthGate";
import { accountUserMessage } from "../account-messages";
import { useAccountSession } from "../useAccountSession";

const FORBIDDEN_NET = /TRC20|ERC20|BEP20|JWT|API/i;

export function SupportClient() {
  const session = useAccountSession();
  const [kind, setKind] = useState<"wrong_chain" | "mis_deposit">("wrong_chain");
  const [tx, setTx] = useState("");
  const [claimed, setClaimed] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setNote(null);
    if (FORBIDDEN_NET.test(claimed)) {
      setErr("네트워크 이름은 쉬운 말로 적어 주세요.");
      return;
    }
    setBusy(true);
    try {
      await createDepositDispute(
        {
          kind,
          linkedTxHash: tx,
          networkClaimedKo: claimed.trim() || undefined,
          idempotencyKey: newDepositDisputeIdempotencyKey(),
        },
        { apiBase: "" },
      );
      setNote("접수했어요. 바로 환불되는 것은 아니에요.");
    } catch (caught) {
      setErr(accountUserMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-account-hub="support">
      <AuthGate state={session}>
        <p>입금이 안 보이면 아래에 알려 주세요.</p>
        <form onSubmit={(e) => void onSubmit(e)}>
          <label>
            어떤 문제인가요
            <select
              name="kind"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "wrong_chain" | "mis_deposit")
              }
            >
              <option value="wrong_chain">다른 길로 보냈어요</option>
              <option value="mis_deposit">입금이 안 보여요</option>
            </select>
          </label>
          <label>
            거래 번호
            <input
              name="linkedTxHash"
              value={tx}
              onChange={(e) => setTx(e.target.value)}
              minLength={8}
              required
              autoComplete="off"
            />
          </label>
          <label>
            어떻게 보냈나요
            <input
              name="networkClaimedKo"
              value={claimed}
              onChange={(e) => setClaimed(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={busy}>
            문의
          </button>
        </form>
        <p>
          <Link href="/me/guide/faq">자주 묻는 질문</Link>
        </p>
        {err ? <p>{err}</p> : null}
        {note ? <p>{note}</p> : null}
      </AuthGate>
    </section>
  );
}
