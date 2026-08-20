"use client";

import { startKakaoOAuth } from "@aipo/sdk/auth";
import { GuestChrome } from "../../../components/GuestChrome";
import { useEffect, useState } from "react";

/**
 * 카카오 연결 시작 — Nest POST start 후 이동.
 * 기술 용어를 화면에 쓰지 않음.
 */
export default function KakaoStartPage() {
  const [note, setNote] = useState("연결하는 중이에요");

  useEffect(() => {
    let cancelled = false;
    void startKakaoOAuth({}, { apiBase: "" })
      .then((out) => {
        if (cancelled) return;
        if (out.status === "ready") {
          window.location.assign(out.authorizeUrl);
          return;
        }
        window.location.replace("/auth/login");
      })
      .catch(() => {
        if (!cancelled) {
          setNote("지금은 카카오로 연결할 수 없어요.");
          window.setTimeout(() => {
            window.location.replace("/auth/login");
          }, 1200);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GuestChrome>
      <main>
        <h1>카카오 연결</h1>
        <p role="status">{note}</p>
      </main>
    </GuestChrome>
  );
}
