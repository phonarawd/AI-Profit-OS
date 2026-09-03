import type { Metadata } from "next";
import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../../components/GuestChrome";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

type Props = { params: Promise<{ variant: string }> };

/** Infra §31.2a — /ads/[variant] alias of /l/[variant] · identical surface */
export default async function AdsVariantPage({ params }: Props) {
  const { variant } = await params;
  return (
    <GuestChrome>
      <Landing3s variant={variant || "meta"} />
    </GuestChrome>
  );
}
