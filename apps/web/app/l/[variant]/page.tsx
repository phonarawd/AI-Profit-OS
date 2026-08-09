import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../../components/GuestChrome";

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
