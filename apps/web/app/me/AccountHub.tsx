"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SD_ASSETS } from "../../components/spark-dash-home/assets";
import { AccountAuthActions, type AccountView } from "./AccountFrame";
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
  { href: "/", label: "홈", icon: SD_ASSETS.iconHome },
  { href: "/profits", label: "기회 탐색", icon: SD_ASSETS.iconExplore },
  { href: "/wallet", label: "내 자산", icon: SD_ASSETS.iconWallet },
  { href: "/trades", label: "참여 내역", icon: SD_ASSETS.iconExplore, native: "list" as const },
  { href: "/wallet/history", label: "정산 내역", icon: SD_ASSETS.iconWallet, native: "receipt" as const },
  { href: "/me/guide/partners", label: "파트너", icon: SD_ASSETS.iconPartner },
  { href: "/me/inbox", label: "알림", icon: SD_ASSETS.iconBell },
  { href: "/me/settings", label: "설정", icon: SD_ASSETS.iconSettings },
] as const;

const MOBILE_NAV = [
  { href: "/", label: "홈", icon: SD_ASSETS.mobileNavHome, key: "home" },
  { href: "/profits", label: "기회 탐색", icon: SD_ASSETS.mobileNavExplore, key: "explore" },
  { href: "/wallet", label: "내 자산", icon: SD_ASSETS.mobileNavWallet, key: "assets" },
  { href: "/me/inbox", label: "알림", icon: SD_ASSETS.mobileNavBell, key: "alerts" },
  { href: "/me", label: "더보기", icon: null, key: "more" },
] as const;

const PRIORITY = [
  {
    href: "/me/kyc",
    title: "본인 확인",
    body: "출금할 때 본인 확인이 필요해요",
    mobileBody: "출금할 때 필요해요",
    icon: HUB_ASSETS.shield,
  },
  {
    href: "/me/invite",
    title: "친구 초대",
    body: "친구를 부르고 코드를 연결해요",
    mobileBody: "코드를 연결해요",
    icon: HUB_ASSETS.users,
  },
] as const;

const MANAGE = [
  { href: "/me/inbox", title: "쪽지함", body: "놓친 안내를 확인해요", icon: HUB_ASSETS.inbox },
  { href: "/me/settings", title: "설정", body: "알림과 계정 설정을 바꿔요", icon: HUB_ASSETS.gear },
  { href: "/wallet", title: "지갑", body: "잔액과 입출금을 봐요", icon: HUB_ASSETS.wallet },
  { href: "/me/peotteok", title: "퍼뜩", body: "궁금한 점을 물어보세요", icon: HUB_ASSETS.spark },
  { href: "/me/support", title: "고객센터", body: "문제가 생기면 여기로 와요", icon: HUB_ASSETS.headset },
  { href: "/me/guide/faq", title: "이용 안내", body: "처음 쓰는 분도 쉽게 봐요", icon: HUB_ASSETS.book },
] as const;

const COMPAT = [
  { href: "/me/benefits", title: "혜택", icon: HUB_ASSETS.gift },
  { href: "/me/membership", title: "멤버십", icon: HUB_ASSETS.card },
  { href: "/me/events", title: "이벤트", icon: HUB_ASSETS.cal },
  { href: "/me/strategies", title: "내 전략", icon: HUB_ASSETS.target },
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
  if (view === "loading") return "불러오는 중…";
  if (view === "unauthorized") return "로그인하면 계정을 볼 수 있어요.";
  if (view === "unavailable") return "계정 상태를 확인할 수 없음";
  return stage === "B_complete"
    ? "프로필이 준비되어 있어요."
    : "프로필을 아직 마치지 않았어요.";
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

  return (
    <div
      className={styles.page}
      data-testid="me-hub"
      data-account-view={view}
      data-account-hub="v2.1"
      data-account-layout={desktop ? "desktop" : "mobile"}
    >
      {!desktop ? (
        <>
      <header className={styles.mobileHeader}>
        <Link className={styles.brand} href="/">
          <p className={styles.brandName}>퍼뜩</p>
          <img className={styles.brandSpark} src={SD_ASSETS.mobileBrandSpark} alt="" />
        </Link>
        <Link className={styles.iconBtn} href="/me/inbox" aria-label="알림">
          <img src={SD_ASSETS.mobileBell} alt="" />
        </Link>
      </header>

      <main className={styles.mobileMain}>
        <div className={styles.pageTitle}>
          <h1>계정</h1>
          <p>내 정보와 설정을 한곳에서 관리하세요.</p>
        </div>
        <div className={styles.profileCard}>
          <span className={styles.avatar}>
            <Glyph src={HUB_ASSETS.user} size={18} />
          </span>
          <div className={styles.profileCopy}>
            <strong>회원님</strong>
            <span data-testid="account-stage">{line}</span>
          </div>
          {ready ? (
            <button
              type="button"
              className={styles.logoutText}
              data-testid="account-logout"
              onClick={onLogout}
            >
              로그아웃
            </button>
          ) : null}
        </div>
        {view === "unauthorized" ? (
          <div>
            <AccountAuthActions />
          </div>
        ) : null}
        {view === "unavailable" ? (
          <p className={styles.err}>계정 상태를 확인할 수 없음</p>
        ) : null}
        {ready && stage && stage !== "B_complete" ? (
          <div className={styles.actions}>
            <Link href="/auth/complete-profile">프로필 이어서 작성</Link>
          </div>
        ) : null}
        {logoutView === "unavailable" ? (
          <p className={styles.err}>지금은 로그아웃할 수 없음</p>
        ) : null}
        <section className={styles.section}>
          <h2>바로 확인</h2>
          <div className={styles.priorityRow}>
            {PRIORITY.map((item) => (
              <Link key={item.href} className={styles.priorityCard} href={item.href}>
                <span className={styles.priorityLead}>
                  <Glyph src={item.icon} size={18} />
                  <strong>{item.title}</strong>
                </span>
                <span>{item.mobileBody}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className={styles.section}>
          <h2>계정 관리</h2>
          <div className={styles.group}>
            {MANAGE.slice(0, 4).map((item) => (
              <Link key={item.href} className={styles.row} href={item.href}>
                <Glyph src={item.icon} />
                <span className={styles.rowCopy}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </span>
                <Glyph src={HUB_ASSETS.chevron} size={16} />
              </Link>
            ))}
          </div>
        </section>
        <section className={styles.section}>
          <h2>도움</h2>
          <div className={styles.group}>
            {MANAGE.slice(4).map((item) => (
              <Link key={item.href} className={styles.row} href={item.href}>
                <Glyph src={item.icon} />
                <span className={styles.rowCopy}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </span>
                <Glyph src={HUB_ASSETS.chevron} size={16} />
              </Link>
            ))}
            <Link className={styles.row} href="/me/legal">
              <Glyph src={HUB_ASSETS.file} />
              <span className={styles.rowCopy}>
                <strong>약관과 정보</strong>
                <span>이용 조건을 확인해요</span>
              </span>
              <Glyph src={HUB_ASSETS.chevron} size={16} />
            </Link>
          </div>
        </section>
        <section className={`${styles.section} ${styles.sectionMuted}`}>
          <h2>기타 서비스</h2>
          <div className={`${styles.group} ${styles.groupMuted}`} data-testid="account-compat">
            {COMPAT.map((item) => (
              <Link key={item.href} className={`${styles.row} ${styles.compatRow}`} href={item.href}>
                <Glyph src={item.icon} size={18} />
                <span className={styles.rowLabel}>{item.title}</span>
                <Glyph src={HUB_ASSETS.chevron} size={14} />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <nav
        className={styles.bottomNav}
        aria-label="하단 이동"
        data-active-nav="더보기"
        data-active-nav-count="1"
      >
        {MOBILE_NAV.map((item) => {
          const active = item.key === "more";
          return (
            <Link
              key={item.key}
              className={`${styles.navItem}${active ? ` ${styles.navItemActive}` : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              {item.icon ? <img src={item.icon} alt="" /> : <span className={styles.navDots}>•••</span>}
              <span>{item.label}</span>
              {active ? <span className={styles.activeMark} aria-hidden /> : null}
            </Link>
          );
        })}
      </nav>
        </>
      ) : null}

      {desktop ? (
      <div className={styles.desktop}>
        <aside className={styles.sidebar}>
          <Link className={styles.sideBrand} href="/">
            <span className={styles.sideBrandRow}>
              <p className={styles.sideBrandName}>퍼뜩</p>
              <img className={styles.sideBrandSpark} src={SD_ASSETS.brandSpark} alt="" />
            </span>
            <p className={styles.tagline}>Global Opportunity Platform</p>
          </Link>
          <nav className={styles.sideNav} aria-label="계정 옆 이동">
            {SIDE_NAV.map((item) => (
              <Link key={item.label} className={styles.sideLink} href={item.href}>
                {"native" in item && item.native ? (
                  <NativeGlyph kind={item.native} />
                ) : (
                  <img src={item.icon} alt="" />
                )}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.walletQuick}>
            <h2>내 자산 요약</h2>
            <p>잔액을 확인할 수 없음</p>
            <Link className={styles.deposit} href="/wallet/deposit">
              입금하기
            </Link>
            <Link className={styles.withdraw} href="/wallet/withdraw">
              출금하기
            </Link>
          </div>
          <Link className={styles.aiCard} href="/me/peotteok">
            <strong>퍼뜩 AI</strong>
            <p>
              계정과 이용 방법을
              <br />
              물어보실 수 있어요.
            </p>
            <img className={styles.aiOrb} src={SD_ASSETS.aiOrb} alt="" />
          </Link>
        </aside>
        <div className={styles.main}>
          <header className={styles.topbar}>
            <Link className={styles.topbarBell} href="/me/inbox" aria-label="알림">
              <img src={SD_ASSETS.headerBell} alt="" />
            </Link>
            <span className={styles.topDivider} aria-hidden />
            <Link className={styles.topUser} href="/me">
              <span className={styles.topAvatar}>
                <img src={SD_ASSETS.avatarFace} alt="" />
              </span>
              <span>회원님</span>
              <span className={styles.topCaret}>⌄</span>
            </Link>
          </header>
          <div className={styles.content}>
            <div className={styles.topBand}>
              <div className={styles.deskTitle}>
                <h1>계정</h1>
                <p>내 정보와 설정을 한곳에서 관리하세요.</p>
              </div>
              <div className={styles.profileSummary}>
                <span className={styles.deskAvatar}>
                  <Glyph src={HUB_ASSETS.user} />
                </span>
                <span>
                  <strong>회원님</strong>
                  <span data-testid="account-stage">{line}</span>
                </span>
                {ready ? (
                  <button
                    type="button"
                    className={styles.logoutBtn}
                    data-testid="account-logout"
                    onClick={onLogout}
                  >
                    로그아웃
                  </button>
                ) : null}
              </div>
            </div>
            <div className={styles.rule} />
            {!ready ? (
              <div className={styles.stateBox}>
                {view === "loading" ? <p className={styles.stateLead}>불러오는 중…</p> : null}
                {view === "unauthorized" ? <AccountAuthActions /> : null}
                {view === "unavailable" ? (
                  <p className={styles.err}>계정 상태를 확인할 수 없음</p>
                ) : null}
              </div>
            ) : null}
            {ready && stage && stage !== "B_complete" ? (
              <div className={styles.actions}>
                <Link href="/auth/complete-profile">프로필 이어서 작성</Link>
              </div>
            ) : null}
            <section className={styles.deskSection}>
              <h2>바로 확인</h2>
              <div className={styles.priorityDesk}>
                {PRIORITY.map((item) => (
                  <Link key={item.href} className={styles.priorityDeskCard} href={item.href}>
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
                  </Link>
                ))}
              </div>
            </section>
            <section className={styles.deskSection}>
              <h2>계정 관리</h2>
              <div className={styles.manageGrid}>
                {MANAGE.map((item) => (
                  <Link key={item.href} className={styles.destCard} href={item.href}>
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
                  </Link>
                ))}
              </div>
            </section>
            <section className={`${styles.deskSection} ${styles.deskSectionSmall}`}>
              <h2>서비스 정보</h2>
              <Link className={`${styles.destCard} ${styles.legalCard}`} href="/me/legal">
                <span className={styles.cardLead}>
                  <span className={`${styles.iconWell} ${styles.iconWellSoft}`}>
                    <Glyph src={HUB_ASSETS.file} />
                  </span>
                  <span>
                    <strong>약관과 정보</strong>
                    <span>이용 조건을 확인해요</span>
                  </span>
                </span>
                <Glyph src={HUB_ASSETS.chevron} size={16} />
              </Link>
            </section>
            <section className={`${styles.deskSection} ${styles.deskSectionSmall}`}>
              <h2>기타 서비스</h2>
              <div className={styles.compatRowDesk} data-testid="account-compat">
                {COMPAT.map((item) => (
                  <Link key={item.href} className={styles.compatChip} href={item.href}>
                    <Glyph src={item.icon} size={16} />
                    {item.title}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}

