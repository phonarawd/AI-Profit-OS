import type { Metadata } from "next";
import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../components/GuestChrome";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/** Infra §31.2a — /ads → same landing-3s surface (default meta) */
export default function AdsPage() {
  return (
    <GuestChrome>
      <Landing3s variant="meta" />
    </GuestChrome>
  );
}
