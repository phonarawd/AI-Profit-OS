import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_CTA_HREF } from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";

export function HomeCleanSessionBanner({
  kind,
  loginHref = HOME_CLEAN_CTA_HREF.login,
}: {
  kind: "guest" | "expired";
  loginHref?: string;
}) {
  const copy =
    kind === "guest"
      ? {
          title: T.home.session.guestTitle,
          body: T.home.session.guestBody,
          cta: T.home.session.guestCta,
        }
      : {
          title: T.home.session.expiredTitle,
          body: T.home.session.expiredBody,
          cta: T.home.session.expiredCta,
        };

  return (
    <aside
      className={styles.sessionBanner}
      role="status"
      data-hc-session-banner={kind}
    >
      <div className={styles.sessionCopy}>
        <p className={styles.sessionTitle}>{copy.title}</p>
        <p className={styles.sessionBody}>{copy.body}</p>
      </div>
      <Link className={styles.sessionCta} href={loginHref}>
        {copy.cta}
      </Link>
    </aside>
  );
}
