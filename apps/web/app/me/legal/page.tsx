"use client";

import Link from "next/link";
import { T } from "@aipo/ui/copy/ko";
import { PremiumCard, PremiumSurface } from "../../../components/putduk-premium";
import { AccountFrame } from "../AccountFrame";
import styles from "./legal.module.css";

const HUB_LINKS = [
  { href: "/me/legal/terms", title: T.legal.termsTitle },
  { href: "/me/legal/privacy", title: T.legal.privacyTitle },
  { href: "/me/legal/oss", title: T.legal.ossTitle },
  { href: "/me/legal/license", title: T.legal.licenseTitle },
] as const;

/** UI §50.3 / §50.9 — legal hub */
export default function Page() {
  return (
    <AccountFrame title={T.legal.hubTitle} view="ready" testId="legal-hub" hideTitle>
      <div className={styles.page}>
        <PremiumSurface as="main" className={styles.surface}>
          <header className={styles.header}>
            <h1 id="legal-hub-title" className="pt-premium-title">
              {T.legal.hubTitle}
            </h1>
            <p className={styles.context}>{T.operator.legal.body}</p>
            <p className={styles.context}>{T.operator.legal.licenseLine}</p>
          </header>
          <nav aria-labelledby="legal-hub-title">
            <ul className={styles.cards}>
              {HUB_LINKS.map((item) => (
                <li key={item.href}>
                  <PremiumCard
                    as={Link}
                    href={item.href}
                    interactive
                    className={`${styles.card} pt-premium-focus`}
                  >
                    <span className={styles.cardTitle}>{item.title}</span>
                    <span className={styles.cardAffordance} aria-hidden="true" />
                  </PremiumCard>
                </li>
              ))}
            </ul>
          </nav>
        </PremiumSurface>
      </div>
    </AccountFrame>
  );
}
