import { redirect } from "next/navigation";

/** Kakao 시작 thin route · 시각 발명 0 · Nest GET start로 넘김 */
export default function KakaoOAuthStartPage() {
  redirect("/api/v1/auth/oauth/kakao/start");
}
