"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isUuid } from "../../../lib/admin-truth";
import { AdminTruth } from "../../../components/AdminTruth";

export default function Page() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const id = draft.trim();
    if (!isUuid(id)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    router.push(`/admin/users/${id}`);
  }

  return (
    <main className="p-6 text-lux-text" data-testid="admin-users">
      <h1 className="text-xl font-semibold">회원 관리</h1>
      <section
        className="mt-6 rounded border border-lux-border p-4"
        data-metric="user-list"
        data-truth="unavailable"
      >
        <h2 className="text-sm text-lux-text-muted">전체 목록</h2>
        <p className="mt-2">
          <AdminTruth value={null} testId="admin-users-list" />
        </p>
        <p className="mt-1 text-xs text-lux-text-muted">
          전체 회원 목록 경로가 없습니다. 알고 있는 회원만 엽니다.
        </p>
      </section>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm" htmlFor="admin-user-jump">
          회원으로 이동
        </label>
        <input
          id="admin-user-jump"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-3 py-2"
          autoComplete="off"
        />
        {invalid ? (
          <p className="text-sm text-lux-text-muted" data-fetch-kind="error">
            회원 번호 형식이 아닙니다.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded bg-lux-elevated px-3 py-2 text-sm"
        >
          열기
        </button>
      </form>
    </main>
  );
}
