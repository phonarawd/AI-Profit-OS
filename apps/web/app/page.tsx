import { cookies } from "next/headers";
import { hasUserSessionCookie } from "../lib/session-cookie";
import { HomePageClient } from "./HomePageClient";

/**
 * Home — §5.3 [A]/[A2]/[B]/[D]/[F]
 * PART9c/9d live Owns = HomePageClient
 * DayPulse [A2] · HomePrincipalRail [B]/[D] · home-money-grid(v1.3)
 * ticker/counter mode 투영 = PART9h
 * 세션 없으면 auth API 호출 스킵 → 브라우저 401 콘솔 잡음 0
 */
export default async function Page() {
  const hasSession = hasUserSessionCookie(await cookies());
  return <HomePageClient hasSession={hasSession} />;
}
