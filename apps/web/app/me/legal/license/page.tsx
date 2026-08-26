"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import operatorEntity from "@aipo/operator-entity";
import {
  PremiumCard,
  PremiumStatus,
  PremiumSurface,
} from "../../../../components/putduk-premium";
import { AccountFrame } from "../../AccountFrame";
import styles from "../legal.module.css";

const entity = operatorEntity as {
  legalName: string;
  legalForm: string;
  licenseNumber: string;
  issuingAuthority: string;
  jurisdiction: string;
  licenseStatus: "active" | "pending_verification";
  primaryActivityEn: string;
  primaryActivityKo: string;
  tradingBrand?: string;
  relatedWebsite?: string;
  licensedActivities: {
    activityKo: string;
    activityEn: string;
    platformScope: string;
  }[];
  addresses: {
    label: string;
    lines: string[];
    city: string;
    country: string;
  }[];
  verificationUrls: { label: string; url: string }[];
};

/** UI §50.9 — /me/legal/license */
export default function Page() {
  const L = T.operator.license;
  const statusLabel =
    entity.licenseStatus === "active" ? L.statusActive : L.statusPending;
  const statusTone =
    entity.licenseStatus === "active" ? "success" : "warning";

  return (
    <AccountFrame title={L.pageTitle} view="ready" testId="legal-license" hideTitle>
      <div className={styles.page}>
        <PremiumSurface as="main" className={styles.surface}>
          <header className={styles.header}>
            <h1 className="pt-premium-title">{L.pageTitle}</h1>
            <p className={styles.context}>{L.pageSubtitle}</p>
          </header>

          <PremiumCard className={styles.disclaimer}>
            <p>{L.disclaimer}</p>
          </PremiumCard>

          <PremiumCard as="section" className={styles.panel}>
            <dl className={styles.fields}>
              <div className={styles.field}>
                <dt>{L.fields.legalName}</dt>
                <dd className={styles.identity}>{entity.legalName}</dd>
              </div>
              <div className={styles.field}>
                <dt>{L.fields.legalForm}</dt>
                <dd>{entity.legalForm}</dd>
              </div>
              <div className={styles.field}>
                <dt>{L.fields.licenseNumber}</dt>
                <dd className={styles.licenseNumber}>{entity.licenseNumber}</dd>
              </div>
              <div className={styles.field}>
                <dt>{L.fields.issuingAuthority}</dt>
                <dd>{entity.issuingAuthority}</dd>
              </div>
              <div className={styles.field}>
                <dt>{L.fields.licenseStatus}</dt>
                <dd>
                  <PremiumStatus label={statusLabel} tone={statusTone} />
                </dd>
              </div>
              <div className={styles.field}>
                <dt>{L.fields.primaryActivity}</dt>
                <dd>
                  {entity.primaryActivityKo}
                  <span className={styles.secondary}>{entity.primaryActivityEn}</span>
                </dd>
              </div>
              {entity.tradingBrand ? (
                <div className={styles.field}>
                  <dt>{L.fields.tradingBrand}</dt>
                  <dd>{entity.tradingBrand}</dd>
                </div>
              ) : null}
              {entity.relatedWebsite ? (
                <div className={styles.field}>
                  <dt>{L.fields.relatedWebsite}</dt>
                  <dd>
                    <a
                      href={entity.relatedWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.external}
                    >
                      {entity.relatedWebsite.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </PremiumCard>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{L.fields.licensedActivities}</h2>
            <ul className={styles.stack}>
              {entity.licensedActivities.map((item) => (
                <li key={item.activityEn}>
                  <PremiumCard className={styles.block}>
                    <p className={styles.itemTitle}>{item.activityKo}</p>
                    <p className={styles.itemMeta}>{item.activityEn}</p>
                  </PremiumCard>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{L.fields.addresses}</h2>
            <div className={styles.stack}>
              {entity.addresses.map((address) => (
                <PremiumCard key={address.label} className={styles.block}>
                  <p className={styles.addressLabel}>{address.label}</p>
                  <p className={styles.addressBody}>
                    {address.lines.join(", ")}
                    <br />
                    {address.city}, {address.country}
                  </p>
                </PremiumCard>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{L.fields.verification}</h2>
            <ul className={styles.stack}>
              {entity.verificationUrls.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.external}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className={styles.actions}>
            <a
              href="/kyb/trade-license-1135431.html"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.printLink} pt-premium-focus`}
            >
              {L.printLink}
            </a>
            <Link
              href="/me/legal"
              className={`${styles.backLink} pt-premium-focus`}
            >
              {L.backToLegal}
            </Link>
          </div>
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}
