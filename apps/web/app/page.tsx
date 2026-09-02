import type { Metadata } from "next";
import operatorEntity from "@aipo/operator-entity";
import { HomeDesktopClient } from "@/app/HomeDesktopClient";
import "../components/spark-dash-home/spark-dash-home.css";

const SITE_URL = "https://hiptk.app";

const operator = operatorEntity as {
  legalName: string;
  licenseNumber: string;
  supportEmail: string;
  addresses: {
    lines: string[];
    city: string;
    country: string;
  }[];
};

const primaryAddress = operator.addresses[0];

const publicIdentityJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": SITE_URL + "/#organization",
      name: operator.legalName,
      legalName: operator.legalName,
      url: SITE_URL,
      email: operator.supportEmail,
      identifier: {
        "@type": "PropertyValue",
        propertyID: "DET Trade License",
        value: operator.licenseNumber,
      },
      ...(primaryAddress
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: primaryAddress.lines.join(", "),
              addressLocality: primaryAddress.city,
              addressCountry: primaryAddress.country,
            },
          }
        : {}),
    },
    {
      "@type": "WebSite",
      "@id": SITE_URL + "/#website",
      name: "퍼뜩",
      alternateName: "PUTDUK",
      url: SITE_URL,
      publisher: {
        "@id": SITE_URL + "/#organization",
      },
    },
  ],
} as const;

export const metadata: Metadata = {
  description: "AI 기반 글로벌 시세·가격 비교 및 동일상품 매칭 플랫폼",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(publicIdentityJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomeDesktopClient />
    </>
  );
}
