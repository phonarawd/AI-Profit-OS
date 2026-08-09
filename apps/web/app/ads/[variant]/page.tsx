import { Landing3s } from "@aipo/ui/components/landing";
import { GuestChrome } from "../../components/GuestChrome";

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
