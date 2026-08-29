"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
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
    <main className="p-6 text-pd-text" data-testid="admin-users">
      <h1 className="text-xl font-semibold">{T.admin.navigation.users}</h1>
      <p className="mt-2 text-sm text-pd-text-muted">
        회원 번호로 한 명씩 찾아 등급, 이용 상태, 입출금 기록을 확인합니다.
      </p>
      <section className="mt-6" data-metric="user-list" data-truth="unavailable">
        <p className="text-sm text-pd-text-muted">
          회원 목록은 아직 연결되지 않았습니다. <AdminTruth value={null} testId="admin-user-list-status" />
        </p>
      </section>
<form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm" htmlFor="admin-user-jump">
          찾을 회원 번호
        </label>
        <input
          id="admin-user-jump"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full max-w-md rounded border border-pd-border bg-pd-bg px-3 py-2"
          autoComplete="off"
          placeholder="회원 번호를 붙여 넣어 주세요"
          aria-describedby={invalid ? "admin-user-jump-error" : undefined}
          aria-invalid={invalid}
        />
        {invalid ? (
          <p id="admin-user-jump-error" className="text-sm text-pd-text-muted" data-fetch-kind="error" role="alert">
            올바른 회원 번호인지 확인해 주세요.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded bg-pd-elevated px-3 py-2 text-sm"
        >
          회원 정보 보기
        </button>
      </form>
    </main>
  );
}
