import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { SD_ASSETS } from "./assets";
import { Skel, StatGlyph, navIcon } from "./home-loading-shared";
import type { SparkDashHomeModel } from "./types";

export function HomeLoadingDesktop({ model }: { model: SparkDashHomeModel }) {
  return (
    <div className="sd-root" data-owner={model.owner} data-name="Home / Desktop / Loading">
      <aside className="sd-sidebar">
        <div className="sd-sidebar-top">
          <div className="sd-brand">
            <p className="sd-wordmark">{T.brand.consumer}</p>
            <img className="sd-brand-spark" src={SD_ASSETS.brandSpark} alt="" />
          </div>
          <p className="sd-tagline">Global Opportunity Platform</p>
          <p className="sd-primary-label">PRIMARY</p>
          <nav className="sd-nav" aria-label={T.home.sidebar.navAria}>
            {model.nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`sd-nav-item${item.key === "home" ? " is-active" : ""}`}
              >
                {navIcon(item)}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sd-sidebar-bottom">
          <section className="sd-wallet-quick">
            <p className="lbl">내 자산 요약</p>
            <p className="sub">사용 가능 자산</p>
            <div className="sd-money-line amt">
              <Skel width="6.4rem" height="1.55rem" />
            </div>
            <div className="sd-krw">
              <Skel width="4.6rem" height="0.7rem" />
            </div>
            <Link className="sd-btn-deposit" href="/wallet/deposit">
              입금하기
            </Link>
            <Link className="sd-btn-withdraw" href="/wallet/withdraw">
              출금하기
            </Link>
          </section>
          <Link className="sd-ai" href="/me/peotteok">
            <div className="sd-ai-copy">
              <p className="title">
                퍼뜩 AI
                <img className="mini" src={SD_ASSETS.miniSpark} alt="" />
              </p>
              <p className="body">
                <span>지금 확인할 수 있는</span>
                <span>기회를 정리하고 있어요.</span>
              </p>
            </div>
            <span className="sd-ai-visual" aria-hidden>
              <img className="glow" src={SD_ASSETS.aiPinkGlow} alt="" />
              <img className="orb" src={SD_ASSETS.aiOrb} alt="" />
              <img className="ring" src={SD_ASSETS.aiRing} alt="" />
              <img className="eye-r" src={SD_ASSETS.aiEyeRight} alt="" />
              <span className="smile" />
            </span>
          </Link>
        </div>
      </aside>

      <main className="sd-main">
        <header className="sd-header">
          <div className="sd-stage sd-header-stage">
            <div className="sd-strip">
              <img src={SD_ASSETS.headerSignal} alt="" />
              <p className="msg">{T.home.header.scanIdle}</p>
              <Link className="sd-strip-link" href="/profits">
                전체 기회 보기 ›
              </Link>
            </div>
            <div className="sd-header-right">
              <Link
                className="sd-header-bell"
                href="/me/inbox"
                aria-label={T.home.header.notificationAria}
              >
                <img src={SD_ASSETS.headerBell} alt="" />
              </Link>
              <span className="sd-header-div" />
              <span className="sd-profile">
                <span className="sd-avatar-wrap" aria-hidden>
                  <span className="sd-avatar">
                    <img className="face" src={SD_ASSETS.avatarFace} alt="" />
                    <img className="body" src={SD_ASSETS.avatarBody} alt="" />
                  </span>
                  <span className="sd-online" />
                </span>
                <span className="sd-userbox">
                  <Skel width="3.6rem" height="0.85rem" />
                  <Skel width="2.4rem" height="0.65rem" />
                </span>
                <span className="sd-chevron">⌄</span>
              </span>
            </div>
          </div>
        </header>

        <section className="sd-intro">
          <div className="sd-stage sd-intro-stage">
            <div className="sd-intro-copy">
              <h1 className="sd-headline">
                지금, 딱 맞는 기회가
                <br />
                <span className="sd-headline-line">
                  당신을 기다리고 있어요!
                  <img className="sd-headline-spark" src={SD_ASSETS.headlineSpark} alt="" />
                </span>
              </h1>
              <p className="sd-eyebrow">{T.home.header.scanIdle}</p>
            </div>
            <div className="sd-intro-art" aria-hidden>
              <img className="sd-halo" src={SD_ASSETS.heroHalo} alt="" />
              <img className="sd-outline-bolt" src={SD_ASSETS.heroLightningOutline} alt="" />
            </div>
          </div>
        </section>

        <div className="sd-content sd-stage">
          <section className="sd-hero">
            <div className="sd-hero-energy" aria-hidden>
              <img className="sd-energy-raster" src={SD_ASSETS.opportunityEnergy} alt="" />
              <img className="sd-energy-streaks" src={SD_ASSETS.energyStreaks} alt="" />
              <span className="sd-energy-core" />
              <span className="sd-energy-floor" />
            </div>
            <div className="sd-hero-left">
              <div className="sd-partner">
                <Skel width="4.2rem" height="1.15rem" />
                <span className="sd-badge">공식 파트너</span>
              </div>
              <div className="sd-hero-title">
                <Skel width="12.5rem" height="1.35rem" />
              </div>
              <div className="sd-metrics">
                <div className="sd-metric">
                  <p className="k">예상 수익률</p>
                  <div className="v rate">
                    <Skel width="3.4rem" height="1.35rem" />
                  </div>
                </div>
                <span className="sd-metric-div" />
                <div className="sd-metric profit">
                  <p className="k">예상 수익</p>
                  <div className="v">
                    <Skel width="6.2rem" height="1.2rem" />
                  </div>
                  <div className="sd-krw">
                    <Skel width="4.4rem" height="0.7rem" />
                  </div>
                </div>
                <span className="sd-metric-div" />
                <div className="sd-metric dur">
                  <p className="k">예상 소요 시간</p>
                  <div className="v">
                    <Skel width="3.8rem" height="1rem" />
                  </div>
                </div>
              </div>
              <div className="sd-capital">
                <p className="k">최소 참여 원금</p>
                <div className="v">
                  <Skel width="7.2rem" height="1.45rem" />
                </div>
                <div className="sd-krw">
                  <Skel width="4.8rem" height="0.7rem" />
                </div>
              </div>
              <div className="sd-status">
                <Skel width="5.6rem" height="1.9rem" radius="999px" />
                <Skel width="9.5rem" height="0.75rem" />
              </div>
            </div>
            <div className="sd-product">
              <span className="sd-product-energy" />
              <span className="sd-product-contact" />
              <Skel width="11rem" height="11rem" radius="1.2rem" />
            </div>
            <aside className="sd-wallet">
              <p className="title">내 참여 가능 금액</p>
              <div className="sd-money-line amt">
                <Skel width="8.2rem" height="1.7rem" />
              </div>
              <div className="sd-krw">
                <Skel width="5.2rem" height="0.75rem" />
              </div>
              <div className="sd-wrows">
                {model.walletRows.map((row) => (
                  <div key={row.key} className={`sd-wrow ${row.tone}`}>
                    <span className={`dot ${row.tone}`} />
                    <span className="lab">{row.label}</span>
                    <div className="vals">
                      <Skel width="4.8rem" height="0.85rem" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="sd-wallet-cta">
                <Link className="sd-cta-primary" href="/profits">
                  지금 참여하기 →
                </Link>
                <Link className="sd-cta-secondary" href="/profits">
                  상세 정보 보기
                </Link>
              </div>
            </aside>
          </section>

          <section className="sd-stats-sec">
            <h2 className="sd-sec-title">내 현황 한눈에 보기</h2>
            <div className="sd-stats">
              {model.stats.map((stat) => (
                <article key={stat.key} className="sd-stat">
                  <div className="sd-stat-top">
                    <span className={`sd-stat-ico ${stat.tone}`} data-stat-icon={stat.key} aria-hidden>
                      <StatGlyph kind={stat.key} />
                    </span>
                    <p className="lab">{stat.label}</p>
                  </div>
                  <div className="sd-money-line val">
                    <Skel tone="ink" width="3.4rem" height="1.25rem" />
                  </div>
                  <div className="sub">
                    <Skel tone="light" width="5.2rem" height="0.7rem" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="sd-pops-sec">
            <div className="sd-pops-head">
              <h2 className="sd-sec-title">실시간 인기 기회</h2>
              <Link className="sd-more" href="/profits">
                더보기 ›
              </Link>
            </div>
            <div className="sd-pops">
              {["a", "b", "c", "d"].map((slot) => (
                <article key={slot} className="sd-pop">
                  <div className="sd-pop-head">
                    <Skel tone="ink" width="3.8rem" height="0.85rem" />
                    <span className="sd-pop-official">공식 파트너</span>
                  </div>
                  <div className="sd-pop-title">
                    <Skel tone="ink" width="8.4rem" height="1.05rem" />
                  </div>
                  <div className="sd-pop-highlight">
                    <div className="sd-pop-rate">
                      <p className="k">예상 수익률</p>
                      <Skel tone="light" width="3.2rem" height="1.15rem" />
                    </div>
                    <div className="sd-pop-profit">
                      <p className="k">예상 수익</p>
                      <Skel tone="ink" width="5.4rem" height="1rem" />
                    </div>
                  </div>
                  <div className="sd-pop-duration">
                    <p className="k">예상 소요 시간</p>
                    <Skel tone="light" width="3.6rem" height="0.85rem" />
                  </div>
                  <div className="sd-pop-capital">
                    <p className="k">최소 원금</p>
                    <Skel tone="ink" width="4.8rem" height="0.85rem" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
