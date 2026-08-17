import Link from "next/link";
import { T } from "../../copy/ko";
import { HOME_CLEAN_ASSET } from "./home-clean-assets";
import { HOME_CLEAN_COPY } from "./home-clean-copy";
import {
  resolveHomeCleanAvatar,
  resolveHomeCleanProfileLabel,
  type HomeCleanProfileSource,
} from "./home-clean-profile";
import { HomeCleanBellIcon, HomeCleanChevronIcon } from "./home-clean-ui-icons";
import styles from "./HomeCleanHeader.module.css";
import responsive from "./HomeCleanResponsive.module.css";

export function HomeCleanHeader({
  viewer = {},
  inboxHref = "/me/inbox",
  meHref = "/me",
}: {
  viewer?: HomeCleanProfileSource;
  inboxHref?: string;
  meHref?: string;
}) {
  const label = resolveHomeCleanProfileLabel(viewer);
  const avatar = resolveHomeCleanAvatar(viewer);

  return (
    <header className={`${styles.header} ${responsive.header}`}>
      <p className={`${styles.brandLockup} ${responsive.brandLockup}`} data-hc-brand="">
        <img
          className={styles.brandMark}
          src={HOME_CLEAN_ASSET.brandSymbol}
          alt=""
        />
        <span>{T.brand.consumer}</span>
      </p>
      <h1
        className={`${styles.greeting} ${responsive.greeting}`}
        aria-label={HOME_CLEAN_COPY.greeting.aria}
      >
        {HOME_CLEAN_COPY.greeting.heading}
      </h1>
      <div className={`${styles.actions} ${responsive.actions}`}>
        <Link
          className={`${styles.bell} ${responsive.bell}`}
          href={inboxHref}
          aria-label={T.home.header.notificationAria}
        >
          <HomeCleanBellIcon />
        </Link>
        <Link
          className={`${styles.profile} ${responsive.profile}`}
          href={meHref}
          aria-label={T.home.header.avatarAria}
        >
          {avatar.kind === "photo" ? (
            <img className={styles.avatar} src={avatar.src} alt="" />
          ) : null}
          {avatar.kind === "initial" ? (
            <span className={styles.initial} aria-hidden>
              {avatar.initial}
            </span>
          ) : null}
          {avatar.kind === "fallback" ? (
            <img
              className={styles.avatar}
              src={HOME_CLEAN_ASSET.avatarFallback}
              alt=""
            />
          ) : null}
          <span className={`${styles.profileName} ${responsive.profileName}`}>
            {label}
          </span>
          <HomeCleanChevronIcon />
        </Link>
      </div>
    </header>
  );
}
