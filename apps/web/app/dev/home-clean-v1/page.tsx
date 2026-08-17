import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type {
  HomeCleanSessionStatus,
  HomeCleanViewState,
} from "@aipo/ui/components/home-clean-v1";
import { HomeCleanDataAdapter } from "../../home-clean/HomeCleanDataAdapter";
import { hasUserSessionCookie } from "../../../lib/session-cookie";
import { USER_TABS } from "../../../routes";

export const metadata: Metadata = {
  title: "퍼뜩",
  robots: { index: false, follow: false },
};

const VIEW_STATES: ReadonlySet<HomeCleanViewState> = new Set([
  "loading",
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
]);

const SESSION_STATES: ReadonlySet<HomeCleanSessionStatus> = new Set([
  "guest",
  "authenticated",
  "expired",
]);

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseView(
  raw: string | undefined,
): HomeCleanViewState | undefined {
  if (!raw || !VIEW_STATES.has(raw as HomeCleanViewState)) return undefined;
  return raw as HomeCleanViewState;
}

function parseSession(
  raw: string | undefined,
): HomeCleanSessionStatus | undefined {
  if (!raw || !SESSION_STATES.has(raw as HomeCleanSessionStatus)) {
    return undefined;
  }
  return raw as HomeCleanSessionStatus;
}

export default async function HomeCleanV1Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = searchParams ? await searchParams : {};
  const mode = firstParam(params.mode) === "live" ? "live" : "fixture";
  const hasSession = hasUserSessionCookie(await cookies());
  return (
    <HomeCleanDataAdapter
      mode={mode}
      tabs={USER_TABS}
      hasSession={hasSession}
      viewOverride={parseView(firstParam(params.hcView))}
      sessionOverride={parseSession(firstParam(params.hcSession))}
    />
  );
}
