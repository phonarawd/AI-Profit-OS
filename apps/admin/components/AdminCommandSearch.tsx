"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAdminCommand } from "../lib/admin-command-search";

export function AdminCommandSearch() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const target = resolveAdminCommand(draft);
    if (!target) return;
    router.push(target.href);
  }

  return (
    <form
      className="admin-command-search"
      onSubmit={onSubmit}
      data-testid="admin-command-search"
      role="search"
    >
      <label className="sr-only" htmlFor="admin-command-q">
        회원과 기록 찾기
      </label>
      <input
        id="admin-command-q"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="회원 번호, 아이디, 이메일"
        autoComplete="off"
      />
      <button type="submit">찾기</button>
    </form>
  );
}
