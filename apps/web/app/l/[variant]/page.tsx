import type { Metadata } from "next";
import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../../components/GuestChrome";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

type Props = { params: Promise<{ variant: string }> };

/** Canon landing-3s · Infra §31.2 canonical /l/* */
export default async function LandingVariantPage({ params }: Props) {
  const { variant } = await params;
  return (
    <GuestChrome>
      <Landing3s variant={variant || "meta"} />
    </GuestChrome>
  );
}
