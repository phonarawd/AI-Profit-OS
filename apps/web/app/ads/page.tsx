import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../components/GuestChrome";

/** Infra §31.2a — /ads → same landing-3s surface (default meta) */
export default function AdsPage() {
  return (
    <GuestChrome>
      <Landing3s variant="meta" />
    </GuestChrome>
  );
}
