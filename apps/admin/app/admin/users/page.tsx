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
    <main className="p-6 text-lux-text" data-testid="admin-users">
      <h1 className="text-xl font-semibold">{T.admin.navigation.users}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        회원 번호로 한 명씩 찾아 등급, 이용 상태, 입출금 기록을 확인합니다.
      </p>
      <section
        className="mt-6 rounded border border-lux-border p-4"
        data-metric="user-list"
        data-truth="unavailable"
      >
        <h2 className="text-base font-medium">전체 회원 수</h2>
        <p className="mt-2">
          <AdminTruth value={null} testId="admin-users-list" />
        </p>
        <p className="mt-1 text-xs text-lux-text-muted">
          전체 회원 목록 연결이 아직 준비되지 않았습니다. 회원 번호를 알고 있는 회원은 아래에서 찾을 수 있습니다.
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
          className="w-full max-w-md rounded border border-lux-border bg-lux-bg px-3 py-2"
          autoComplete="off"
          placeholder="회원 번호를 붙여 넣어 주세요"
          aria-describedby={invalid ? "admin-user-jump-error" : undefined}
          aria-invalid={invalid}
        />
        {invalid ? (
          <p id="admin-user-jump-error" className="text-sm text-lux-text-muted" data-fetch-kind="error" role="alert">
            올바른 회원 번호인지 확인해 주세요.
          </p>
        ) : null}
        <button
          type="submit"
          className="rounded bg-lux-elevated px-3 py-2 text-sm"
        >
          회원 정보 보기
        </button>
      </form>
    </main>
  );
}
