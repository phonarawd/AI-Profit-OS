import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminLoginMintClient } from "./AdminLoginMintClient";

const DEDICATED_HOST = "ai-profit-web-dedicated.ebay-adapter.workers.dev";

export const metadata: Metadata = {
  title: "퍼뜩",
  robots: { index: false, follow: false },
};

export default async function AdminLoginMintPage() {
  const host = (await headers()).get("host") || "";
  if (host.split(":")[0].toLowerCase() !== DEDICATED_HOST) notFound();
  return <AdminLoginMintClient />;
}
