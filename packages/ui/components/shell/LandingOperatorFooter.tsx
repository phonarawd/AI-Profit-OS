import Link from "next/link";
import operatorEntity from "../../../../schemas/operator-entity.instance.json";
import { T } from "../../copy/ko";

type OperatorEntity = {
  legalName: string;
  licenseNumber: string;
  supportEmail: string;
  jurisdiction: string;
  addresses: { city: string; country: string; lines: string[] }[];
};

const entity = operatorEntity as OperatorEntity;

/**
 * §6.4c.1 D — landing/ads scroll 최하단 operator footer
 * SSOT = schemas/operator-entity.instance.json · JSX 하드코딩 0
 */
export function LandingOperatorFooter({ className = "" }: { className?: string }) {
  const primary = entity.addresses[0];
  const addressLine = primary
    ? `${primary.city}, ${primary.country}`
    : entity.jurisdiction;

  return (
    <footer
      data-testid="landing-operator-footer"
      data-canon-block="operator-footer"
      className={`mt-8 border-t border-lux-border px-2 pt-4 pb-2 text-center text-xs text-lux-text-muted ${className}`.trim()}
    >
      <p data-operator-field="legalName" className="font-medium text-lux-text">
        {entity.legalName}
      </p>
      <p data-operator-field="licenseNumber" className="mt-1">
        {T.landing.detLicensePrefix} {entity.licenseNumber}
      </p>
      <p data-operator-field="supportEmail" className="mt-1">
        <a
          href={`mailto:${entity.supportEmail}`}
          className="text-lux-principal underline-offset-2 hover:underline"
        >
          {entity.supportEmail}
        </a>
      </p>
      <p data-operator-field="jurisdiction" className="mt-1">
        {entity.jurisdiction} · {addressLine}
      </p>
      <p className="mt-2">
        <Link
          href="/me/legal"
          className="text-lux-principal underline-offset-2 hover:underline"
        >
          {T.landing.legalLink}
        </Link>
      </p>
    </footer>
  );
}
