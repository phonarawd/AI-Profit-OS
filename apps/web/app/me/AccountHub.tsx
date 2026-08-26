"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SD_ASSETS } from "../../components/spark-dash-home/assets";
import {
  PremiumCard,
  PremiumEmptyState,
  PremiumMetric,
  PremiumStatus,
  PremiumSurface,
} from "../../components/putduk-premium";
import { AccountAuthActions, type AccountView } from "./AccountFrame";
import { HUB_COPY } from "./account-hub-copy";
import { HUB_ASSETS } from "./account-hub-assets";
import styles from "./account-hub.module.css";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

const SIDE_NAV = [
  { href: "/", label: HUB_COPY.navHome, icon: SD_ASSETS.iconHome },
  { href: "/profits", label: HUB_COPY.navExplore, icon: SD_ASSETS.iconExplore },
  { href: "/wallet", label: HUB_COPY.navWallet, icon: SD_ASSETS.iconWallet },
  { href: "/trades", label: HUB_COPY.navTrades, icon: SD_ASSETS.iconExplore, native: "list" as const },
  { href: "/wallet/history", label: HUB_COPY.navHistory, icon: SD_ASSETS.iconWallet, native: "receipt" as const },
  { href: "/me/guide/partners", label: HUB_COPY.navPartners, icon: SD_ASSETS.iconPartner },
  { href: "/me/inbox", label: HUB_COPY.navAlerts, icon: SD_ASSETS.iconBell },
  { href: "/me/settings", label: HUB_COPY.navSettings, icon: SD_ASSETS.iconSettings },
] as const;

const MOBILE_NAV = [
  { href: "/", label: HUB_COPY.navHome, icon: SD_ASSETS.mobileNavHome, key: "home" },
  { href: "/profits", label: HUB_COPY.navExplore, icon: SD_ASSETS.mobileNavExplore, key: "explore" },
  { href: "/wallet", label: HUB_COPY.navWallet, icon: SD_ASSETS.mobileNavWallet, key: "assets" },
  { href: "/me/inbox", label: HUB_COPY.navAlerts, icon: SD_ASSETS.mobileNavBell, key: "alerts" },
  { href: "/me", label: HUB_COPY.navMore, icon: null, key: "more" },
] as const;

const PRIORITY = [
  {
    href: "/me/kyc",
    title: HUB_COPY.kycTitle,
    body: HUB_COPY.kycBody,
    mobileBody: HUB_COPY.kycMobile,
    icon: HUB_ASSETS.shield,
  },
  {
    href: "/me/invite",
    title: HUB_COPY.inviteTitle,
    body: HUB_COPY.inviteBody,
    mobileBody: HUB_COPY.inviteMobile,
    icon: HUB_ASSETS.users,
  },
] as const;

const MANAGE = [
  { href: "/me/inbox", title: HUB_COPY.inboxTitle, body: HUB_COPY.inboxBody, icon: HUB_ASSETS.inbox },
  { href: "/me/settings", title: HUB_COPY.navSettings, body: HUB_COPY.settingsBody, icon: HUB_ASSETS.gear },
  { href: "/wallet", title: HUB_COPY.walletLink, body: HUB_COPY.walletBody, icon: HUB_ASSETS.wallet },
  { href: "/me/peotteok", title: HUB_COPY.brand, body: HUB_COPY.peotteokBody, icon: HUB_ASSETS.spark },
  { href: "/me/support", title: HUB_COPY.supportTitle, body: HUB_COPY.supportBody, icon: HUB_ASSETS.headset },
  { href: "/me/guide/faq", title: HUB_COPY.guideTitle, body: HUB_COPY.guideBody, icon: HUB_ASSETS.book },
] as const;

const COMPAT = [
  { href: "/me/benefits", title: HUB_COPY.benefits, icon: HUB_ASSETS.gift },
  { href: "/me/membership", title: HUB_COPY.membership, icon: HUB_ASSETS.card },
  { href: "/me/events", title: HUB_COPY.events, icon: HUB_ASSETS.cal },
  { href: "/me/strategies", title: HUB_COPY.strategies, icon: HUB_ASSETS.target },
] as const;

function Glyph({
  src,
  size = 20,
}: {
  src: string;
  size?: number;
}) {
  const className = size <= 16 ? styles.glyphSm : size <= 18 ? styles.glyphMd : styles.glyph;
  return <img className={className} src={src} alt="" width={size} height={size} />;
}

function NativeGlyph({ kind }: { kind: "list" | "receipt" }) {
  return <span className={`${styles.sideGlyph} ${styles[kind]}`} aria-hidden />;
}

function profileLine(stage: string | null, view: AccountView) {
  if (view === "loading") return HUB_COPY.loadingEllipsis;
  if (view === "unauthorized") return HUB_COPY.loginLine;
  if (view === "unavailable") return HUB_COPY.unavailableLine;
  return stage === "B_complete" ? HUB_COPY.profileReady : HUB_COPY.profileIncomplete;
}

function hubStatus(
  view: AccountView,
  stage: string | null,
  logoutView: "idle" | "saving" | "unavailable",
): {
  label: string;
  tone: "neutral" | "live" | "success" | "warning" | "danger";
  live?: boolean;
} {
  if (logoutView === "saving") return { label: HUB_COPY.logoutBusy, tone: "live", live: true };
  if (logoutView === "unavailable") return { label: HUB_COPY.logoutFail, tone: "danger" };
  if (view === "loading") return { label: HUB_COPY.loading, tone: "live", live: true };
  if (view === "unauthorized") return { label: HUB_COPY.loginNeed, tone: "warning" };
  if (view === "unavailable") return { label: HUB_COPY.checkSoon, tone: "warning" };
  if (stage === "B_complete") return { label: HUB_COPY.profileReadyChip, tone: "success" };
  return { label: HUB_COPY.profileContinue, tone: "warning" };
}

export function AccountHub({
  view,
  stage,
  logoutView,
  onLogout,
}: {
  view: AccountView;
  stage: string | null;
  logoutView: "idle" | "saving" | "unavailable";
  onLogout: () => void;
}) {
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const line = profileLine(stage, view);
  const ready = view === "ready";
  const status = hubStatus(view, stage, logoutView);
  const showProfileContinue = Boolean(ready && stage && stage !== "B_complete");

  return (
    <div
      className={styles.page}
      data-testid="me-hub"
      data-account-view={view}
      data-account-hub="v2.1"
      data-account-layout={desktop ? "desktop" : "mobile"}
      aria-busy={view === "loading"}
    >
      {!desktop ? (
        <AccountHubMobile
          line={line}
          status={status}
          view={view}
          ready={ready}
          logoutView={logoutView}
          showProfileContinue={showProfileContinue}
          onLogout={onLogout}
        />
      ) : (
        <AccountHubDesktop
          line={line}
          status={status}
          view={view}
          ready={ready}
          logoutView={logoutView}
          showProfileContinue={showProfileContinue}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

function AccountHubMobile({
  line,
  status,
  view,
  ready,
  logoutView,
  showProfileContinue,
  onLogout,
}: {
  line: string;
  status: ReturnType<typeof hubStatus>;
  view: AccountView;
  ready: boolean;
  logoutView: "idle" | "saving" | "unavailable";
  showProfileContinue: boolean;
  onLogout: () => void;
}) {
  return (
    <>
      <header className={styles.mobileHeader}>
        <Link className={`${styles.brand} pt-premium-focus`} href="/">
          <p className={styles.brandName}>{HUB_COPY.brand}</p>
          <img className={styles.brandSpark} src={SD_ASSETS.mobileBrandSpark} alt="" />
        </Link>
        <Link className={`${styles.iconBtn} pt-premium-focus`} href="/me/inbox" aria-label={HUB_COPY.ariaAlert}>
          <img src={SD_ASSETS.mobileBell} alt="" />
        </Link>
      </header>
      <main className={styles.mobileMain}>
        <div className={styles.pageTitle}>
          <p className="pt-premium-kicker">{HUB_COPY.kicker}</p>
          <h1>{HUB_COPY.title}</h1>
          <p>{HUB_COPY.lead}</p>
        </div>
        <PremiumSurface as="section" className={styles.profileSurface} aria-label={HUB_COPY.ariaStatus}>
          <span className={styles.avatar} aria-hidden>
            {view === "loading" ? (
              <span className={`pt-premium-skeleton ${styles.avatarSkel}`} />
            ) : (
              <Glyph src={HUB_ASSETS.user} size={18} />
            )}
          </span>
          <div className={styles.profileCopy}>
            <strong>{HUB_COPY.member}</strong>
            <span data-testid="account-stage">{line}</span>
          </div>
          <PremiumStatus label={status.label} tone={status.tone} live={status.live} />
          {ready ? (
            <button
              type="button"
              className={`${styles.logoutText} pt-premium-focus`}
              data-testid="account-logout"
              aria-label={HUB_COPY.logout}
              disabled={logoutView === "saving"}
              onClick={onLogout}
            >
              {HUB_COPY.logout}
            </button>
          ) : null}
        </PremiumSurface>
        {view === "unauthorized" ? (
          <PremiumSurface as="section" className={styles.stateSurface}>
            <PremiumEmptyState
              title={HUB_COPY.loginTitle}
              description={HUB_COPY.loginLine}
              action={<AccountAuthActions />}
            />
          </PremiumSurface>
        ) : null}
        {view === "unavailable" ? (
          <PremiumSurface as="section" className={styles.stateSurface}>
            <PremiumEmptyState
              title={HUB_COPY.unavailableTitle}
              description={HUB_COPY.unavailableLine}
            />
          </PremiumSurface>
        ) : null}
        {showProfileContinue ? (
          <div className={styles.actions}>
            <Link className="pt-premium-focus" href="/auth/complete-profile">
              {HUB_COPY.profileContinue}
            </Link>
          </div>
        ) : null}
        {logoutView === "unavailable" ? (
          <p className={styles.err} role="alert">
            {HUB_COPY.logoutFail}
          </p>
        ) : null}
        <section className={styles.section}>
          <h2>{HUB_COPY.sectionNow}</h2>
          <div className={styles.priorityRow}>
            {PRIORITY.map((item) => (
              <PremiumCard
                key={item.href}
                as={Link}
                href={item.href}
                interactive
                className={`${styles.priorityCard} pt-premium-focus`}
              >
                <span className={styles.priorityLead}>
                  <Glyph src={item.icon} size={18} />
                  <strong>{item.title}</strong>
                </span>
                <span>{item.mobileBody}</span>
              </PremiumCard>
            ))}
          </div>
        </section>
        <section className={styles.section}>
          <h2>{HUB_COPY.sectionManage}</h2>
          <PremiumSurface as="div" className={styles.group}>
            {MANAGE.slice(0, 4).map((item) => (
              <HubRow key={item.href} item={item} />
            ))}
          </PremiumSurface>
        </section>
        <section className={styles.section}>
          <h2>{HUB_COPY.sectionHelp}</h2>
          <PremiumSurface as="div" className={styles.group}>
            {MANAGE.slice(4).map((item) => (
              <HubRow key={item.href} item={item} />
            ))}
            <Link className={`${styles.row} pt-premium-focus`} href="/me/legal">
              <Glyph src={HUB_ASSETS.file} />
              <span className={styles.rowCopy}>
                <strong>{HUB_COPY.legalTitle}</strong>
                <span>{HUB_COPY.legalBody}</span>
              </span>
              <Glyph src={HUB_ASSETS.chevron} size={16} />
            </Link>
          </PremiumSurface>
        </section>
        <section className={`${styles.section} ${styles.sectionMuted}`}>
          <h2>{HUB_COPY.sectionCompat}</h2>
          <PremiumSurface as="div" className={`${styles.group} ${styles.groupMuted}`} data-testid="account-compat">
            {COMPAT.map((item) => (
              <Link key={item.href} className={`${styles.row} ${styles.compatRow} pt-premium-focus`} href={item.href}>
                <Glyph src={item.icon} size={18} />
                <span className={styles.rowLabel}>{item.title}</span>
                <Glyph src={HUB_ASSETS.chevron} size={14} />
              </Link>
            ))}
          </PremiumSurface>
        </section>
      </main>
      <nav
        className={styles.bottomNav}
        aria-label={HUB_COPY.ariaBottom}
        data-active-nav={HUB_COPY.navMore}
        data-active-nav-count="1"
      >
        {MOBILE_NAV.map((item) => {
          const active = item.key === "more";
          return (
            <Link
              key={item.key}
              className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ""} pt-premium-focus`}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              {item.icon ? <img src={item.icon} alt="" /> : <span className={styles.navDots}>...</span>}
              <span>{item.label}</span>
              {active ? <span className={styles.activeMark} aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function HubRow({
  item,
}: {
  item: { href: string; title: string; body: string; icon: string };
}) {
  return (
    <Link className={`${styles.row} pt-premium-focus`} href={item.href}>
      <Glyph src={item.icon} />
      <span className={styles.rowCopy}>
        <strong>{item.title}</strong>
        <span>{item.body}</span>
      </span>
      <Glyph src={HUB_ASSETS.chevron} size={16} />
    </Link>
  );
}

function AccountHubDesktop({
  line,
  status,
  view,
  ready,
  logoutView,
  showProfileContinue,
  onLogout,
}: {
  line: string;
  status: ReturnType<typeof hubStatus>;
  view: AccountView;
  ready: boolean;
  logoutView: "idle" | "saving" | "unavailable";
  showProfileContinue: boolean;
  onLogout: () => void;
}) {
  return (
    <div className={styles.desktop}>
      <aside className={styles.sidebar}>
        <Link className={`${styles.sideBrand} pt-premium-focus`} href="/">
          <span className={styles.sideBrandRow}>
            <p className={styles.sideBrandName}>{HUB_COPY.brand}</p>
            <img className={styles.sideBrandSpark} src={SD_ASSETS.brandSpark} alt="" />
          </span>
          <p className={styles.tagline}>{HUB_COPY.tagline}</p>
        </Link>
        <nav className={styles.sideNav} aria-label={HUB_COPY.ariaSide}>
          {SIDE_NAV.map((item) => (
            <Link key={item.label} className={`${styles.sideLink} pt-premium-focus`} href={item.href}>
              {"native" in item && item.native ? (
                <NativeGlyph kind={item.native} />
              ) : (
                <img src={item.icon} alt="" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>
        <PremiumSurface as="section" className={styles.walletQuick} aria-label={HUB_COPY.walletTitle}>
          <PremiumMetric
            label={HUB_COPY.walletTitle}
            value={HUB_COPY.walletValue}
            secondary={HUB_COPY.walletHint}
          />
          <Link className={`${styles.deposit} pt-premium-focus`} href="/wallet/deposit">
            {HUB_COPY.deposit}
          </Link>
          <Link className={`${styles.withdraw} pt-premium-focus`} href="/wallet/withdraw">
            {HUB_COPY.withdraw}
          </Link>
        </PremiumSurface>
        <Link className={`${styles.aiCard} pt-premium-focus`} href="/me/peotteok">
          <strong>{HUB_COPY.brand}</strong>
          <p>
            {HUB_COPY.aiBody1}
            <br />
            {HUB_COPY.aiBody2}
          </p>
          <img className={styles.aiOrb} src={SD_ASSETS.aiOrb} alt="" />
        </Link>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <Link className={`${styles.topbarBell} pt-premium-focus`} href="/me/inbox" aria-label={HUB_COPY.ariaAlert}>
            <img src={SD_ASSETS.headerBell} alt="" />
          </Link>
          <span className={styles.topDivider} aria-hidden />
          <Link className={`${styles.topUser} pt-premium-focus`} href="/me">
            <span className={styles.topAvatar}>
              <img src={SD_ASSETS.avatarFace} alt="" />
            </span>
            <span>{HUB_COPY.member}</span>
            <span className={styles.topCaret} aria-hidden>
              v
            </span>
          </Link>
        </header>
        <div className={styles.content}>
          <div className={styles.topBand}>
            <div className={styles.deskTitle}>
              <p className="pt-premium-kicker">{HUB_COPY.kicker}</p>
              <h1>{HUB_COPY.title}</h1>
              <p>{HUB_COPY.lead}</p>
            </div>
            <PremiumSurface as="div" className={styles.profileSummary}>
              <span className={styles.deskAvatar} aria-hidden>
                <Glyph src={HUB_ASSETS.user} />
              </span>
              <span>
                <strong>{HUB_COPY.member}</strong>
                <span data-testid="account-stage">{line}</span>
              </span>
              <PremiumStatus label={status.label} tone={status.tone} live={status.live} />
              {ready ? (
                <button
                  type="button"
                  className={`${styles.logoutBtn} pt-premium-focus`}
                  data-testid="account-logout"
                  aria-label={HUB_COPY.logout}
                  disabled={logoutView === "saving"}
                  onClick={onLogout}
                >
                  {HUB_COPY.logout}
                </button>
              ) : null}
            </PremiumSurface>
          </div>
          <div className={styles.rule} />
          {!ready ? (
            <div className={styles.stateBox}>
              {view === "loading" ? <p className={styles.stateLead}>{HUB_COPY.loadingEllipsis}</p> : null}
              {view === "unauthorized" ? (
                <PremiumEmptyState
                  title={HUB_COPY.loginTitle}
                  description={HUB_COPY.loginLine}
                  action={<AccountAuthActions />}
                />
              ) : null}
              {view === "unavailable" ? (
                <PremiumEmptyState
                  title={HUB_COPY.unavailableTitle}
                  description={HUB_COPY.unavailableLine}
                />
              ) : null}
            </div>
          ) : null}
          {showProfileContinue ? (
            <div className={styles.actions}>
              <Link className="pt-premium-focus" href="/auth/complete-profile">
                {HUB_COPY.profileContinue}
              </Link>
            </div>
          ) : null}
          <section className={styles.deskSection}>
            <h2>{HUB_COPY.sectionNow}</h2>
            <div className={styles.priorityDesk}>
              {PRIORITY.map((item) => (
                <PremiumCard
                  key={item.href}
                  as={Link}
                  href={item.href}
                  interactive
                  className={`${styles.priorityDeskCard} pt-premium-focus`}
                >
                  <span className={styles.cardLead}>
                    <span className={styles.iconWell}>
                      <Glyph src={item.icon} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </span>
                  <Glyph src={HUB_ASSETS.chevron} size={16} />
                </PremiumCard>
              ))}
            </div>
          </section>
          <section className={styles.deskSection}>
            <h2>{HUB_COPY.sectionManage}</h2>
            <div className={styles.manageGrid}>
              {MANAGE.map((item) => (
                <PremiumCard
                  key={item.href}
                  as={Link}
                  href={item.href}
                  interactive
                  className={`${styles.destCard} pt-premium-focus`}
                >
                  <span className={styles.cardLead}>
                    <span className={`${styles.iconWell} ${styles.iconWellSoft}`}>
                      <Glyph src={item.icon} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.body}</span>
                    </span>
                  </span>
                  <Glyph src={HUB_ASSETS.chevron} size={16} />
                </PremiumCard>
              ))}
            </div>
          </section>
          <section className={`${styles.deskSection} ${styles.deskSectionSmall}`}>
            <h2>{HUB_COPY.sectionLegal}</h2>
            <PremiumCard
              as={Link}
              href="/me/legal"
              interactive
              className={`${styles.destCard} ${styles.legalCard} pt-premium-focus`}
            >
              <span className={styles.cardLead}>
                <span className={`${styles.iconWell} ${styles.iconWellSoft}`}>
                  <Glyph src={HUB_ASSETS.file} />
                </span>
                <span>
                  <strong>{HUB_COPY.legalTitle}</strong>
                  <span>{HUB_COPY.legalBody}</span>
                </span>
              </span>
              <Glyph src={HUB_ASSETS.chevron} size={16} />
            </PremiumCard>
          </section>
          <section className={`${styles.deskSection} ${styles.deskSectionSmall}`}>
            <h2>{HUB_COPY.sectionCompat}</h2>
            <div className={styles.compatRowDesk} data-testid="account-compat">
              {COMPAT.map((item) => (
                <PremiumCard
                  key={item.href}
                  as={Link}
                  href={item.href}
                  interactive
                  className={`${styles.compatChip} pt-premium-focus`}
                >
                  <Glyph src={item.icon} size={16} />
                  {item.title}
                </PremiumCard>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
