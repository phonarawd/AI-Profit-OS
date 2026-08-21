"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import operatorEntity from "@aipo/operator-entity";
import { AccountFrame } from "../../AccountFrame";
import styles from "../../account.module.css";

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

  return (
    <AccountFrame title={L.pageTitle} view="ready" testId="legal-license" hideTitle>
    <main className={styles.surface}>
      <h1 className="text-xl font-semibold">{L.pageTitle}</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        {L.pageSubtitle}
      </p>
      <p className="mt-4 rounded-lg border border-lux-border bg-lux-surface p-3 text-xs leading-relaxed text-lux-text-muted">
        {L.disclaimer}
      </p>

      <section className="mt-6 space-y-4 rounded-xl border border-lux-border bg-lux-surface p-4">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-lux-text-muted">{L.fields.legalName}</dt>
            <dd className="mt-1 font-semibold">{entity.legalName}</dd>
          </div>
          <div>
            <dt className="text-lux-text-muted">{L.fields.legalForm}</dt>
            <dd className="mt-1">{entity.legalForm}</dd>
          </div>
          <div>
            <dt className="text-lux-text-muted">{L.fields.licenseNumber}</dt>
            <dd className="mt-1 font-semibold tracking-wide">{entity.licenseNumber}</dd>
          </div>
          <div>
            <dt className="text-lux-text-muted">{L.fields.issuingAuthority}</dt>
            <dd className="mt-1">{entity.issuingAuthority}</dd>
          </div>
          <div>
            <dt className="text-lux-text-muted">{L.fields.licenseStatus}</dt>
            <dd className="mt-1">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--color-lux-accent)_18%,transparent)] px-2 py-0.5 text-xs font-semibold text-lux-accent">
                {statusLabel}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-lux-text-muted">{L.fields.primaryActivity}</dt>
            <dd className="mt-1">
              {entity.primaryActivityKo}
              <span className="mt-1 block text-xs text-lux-text-muted">
                {entity.primaryActivityEn}
              </span>
            </dd>
          </div>
          {entity.tradingBrand ? (
            <div>
              <dt className="text-lux-text-muted">{L.fields.tradingBrand}</dt>
              <dd className="mt-1">{entity.tradingBrand}</dd>
            </div>
          ) : null}
          {entity.relatedWebsite ? (
            <div>
              <dt className="text-lux-text-muted">{L.fields.relatedWebsite}</dt>
              <dd className="mt-1">
                <a
                  href={entity.relatedWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lux-accent underline"
                >
                  {entity.relatedWebsite.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{L.fields.licensedActivities}</h2>
        <ul className="mt-3 space-y-2">
          {entity.licensedActivities.map((item) => (
            <li
              key={item.activityEn}
              className="rounded-lg border border-lux-border bg-lux-surface p-3 text-sm"
            >
              <p>{item.activityKo}</p>
              <p className="mt-1 text-xs text-lux-text-muted">
                {item.activityEn}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{L.fields.addresses}</h2>
        <div className="mt-3 space-y-2">
          {entity.addresses.map((address) => (
            <div
              key={address.label}
              className="rounded-lg border border-lux-border bg-lux-surface p-3 text-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-lux-text-muted">
                {address.label}
              </p>
              <p className="mt-2 leading-relaxed">
                {address.lines.join(", ")}
                <br />
                {address.city}, {address.country}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">{L.fields.verification}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {entity.verificationUrls.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lux-accent underline"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3">
        <a
          href="/kyb/trade-license-1135431.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-lux-border px-4 py-3 text-sm font-medium"
        >
          {L.printLink}
        </a>
        <Link
          href="/me/legal"
          className="text-center text-sm text-lux-accent underline"
        >
          {L.backToLegal}
        </Link>
      </div>
    </main>
    </AccountFrame>
  );
}
