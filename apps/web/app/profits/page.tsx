import { cookies } from "next/headers";
import { hasUserSessionCookie } from "../../lib/session-cookie";
import { ProfitsPageClient } from "./ProfitsPageClient";

/**
 * PART9e /profits — server session gate · live Owns = ProfitsPageClient
 */
export default async function Page() {
  const hasSession = hasUserSessionCookie(await cookies());
  return <ProfitsPageClient hasSession={hasSession} />;
}
