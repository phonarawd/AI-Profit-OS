import { T } from "@aipo/ui/copy/ko";
import Link from "next/link";
import { SD_ASSETS } from "./assets";
import { Skel, navHref } from "./home-loading-shared";
import type { SparkDashHomeModel } from "./types";

export function LoadingMobile({ model }: { model: SparkDashHomeModel }) {
  return (
    <div className="sdm-root" data-owner={model.owner} data-name="Home / Mobile / Loading">
      <header className="sdm-header">
        <div className="sdm-brand">
          <p className="sdm-wordmark">{T.brand.consumer}</p>
          <img className="sdm-brand-spark" src={SD_ASSETS.mobileBrandSpark} alt="" width={14} height={26} />
        </div>
        <Link className="sdm-bell" href="/me/inbox" aria-label={T.home.header.notificationAria}>
          <img src={SD_ASSETS.mobileBell} alt="" width={22} height={22} />
        </Link>
      </header>
      <div className="sdm-scroll">
        <div className="sdm-stack">
          <div className="sdm-strip">
            <p>{T.home.header.scanIdle}</p>
          </div>
          <section className="sdm-greet">
            <div className="sdm-greet-hello">
              <Skel width="7.2rem" height="0.85rem" />
            </div>
            <h1 className="sdm-greet-title">
              지금, 딱 맞는 기회가
              <br />
              당신을 기다리고 있어요!
            </h1>
            <span className="sdm-greet-bolt" aria-hidden>
              <img src={SD_ASSETS.mobileHeroLightning} alt="" width={58} height={88} />
            </span>
          </section>
          <LoadingMobileHero />
          <LoadingMobileWallet model={model} />
          <LoadingMobileRest model={model} />
        </div>
      </div>
      <nav className="sdm-nav" aria-label="하단 메뉴" data-sdm="nav">
        {model.nav.slice(0, 5).map((item) => (
          <Link
            key={item.key}
            href={navHref(model, item.key, item.href)}
            className={`sdm-nav-item${item.key === "home" ? " is-active" : ""}`}
          >
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function LoadingMobileHero() {
  return (
    <section className="sdm-hero" data-sdm="hero">
      <div className="sdm-hero-top">
        <Skel width="3.6rem" height="1rem" />
        <span className="sdm-badge">공식 파트너</span>
      </div>
      <div className="sdm-hero-title">
        <Skel width="11rem" height="1.2rem" />
      </div>
      <div className="sdm-product" data-sdm="product">
        <span className="sdm-product-bloom" aria-hidden />
        <Skel width="100%" height="5.6rem" radius="1rem" />
      </div>
      <div className="sdm-metrics">
        <div className="sdm-metric">
          <p className="k">예상 수익률</p>
          <Skel width="2.8rem" height="1.05rem" />
        </div>
        <div className="sdm-metric">
          <p className="k">예상 수익</p>
          <Skel width="4.6rem" height="1.05rem" />
        </div>
        <div className="sdm-metric">
          <p className="k">예상 소요 시간</p>
          <Skel width="3.2rem" height="1.05rem" />
        </div>
      </div>
      <Link className="sdm-cta" href="/profits" data-sdm="cta">
        지금 참여하기
      </Link>
    </section>
  );
}

function LoadingMobileWallet({ model }: { model: SparkDashHomeModel }) {
  return (
    <section className="sdm-wallet">
      <div className="sdm-wallet-top">
        <div>
          <p className="sdm-wallet-label">내 자산 현황</p>
          <div className="sdm-wallet-amt">
            <Skel width="7.4rem" height="1.6rem" />
          </div>
        </div>
        <Link className="sdm-deposit" href="/wallet/deposit">
          입금하기
        </Link>
      </div>
      <div className="sdm-buckets">
        {model.walletRows.map((row) => (
          <div key={row.key} className="sdm-bucket">
            <p className="sdm-bucket-lab">{row.label}</p>
            <Skel width="2.8rem" height="0.95rem" />
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingMobileRest({ model }: { model: SparkDashHomeModel }) {
  return (
    <>
      <Link className="sdm-ai" href="/me/peotteok" data-sdm="ai">
        <div className="sdm-ai-copy">
          <p className="title">퍼뜩 AI</p>
          <p className="body">지금 확인할 수 있는 기회를 정리하고 있어요.</p>
        </div>
        <span className="sdm-ai-visual" aria-hidden>
          <img className="sdm-ai-agent" src={SD_ASSETS.mobileAiAgent} alt="" width={64} height={64} />
        </span>
      </Link>
      <section className="sdm-summary">
        <h2 className="sdm-sec-title">내 현황 한눈에 보기</h2>
        <div className="sdm-summary-grid">
          {model.stats.map((stat) => (
            <article key={stat.key} className="sdm-stat">
              <p className="lab">{stat.label}</p>
              <Skel width="3.2rem" height="1.15rem" />
            </article>
          ))}
        </div>
      </section>
      <section className="sdm-pops">
        <h2 className="sdm-sec-title">실시간 인기 기회</h2>
        {["m1", "m2", "m3"].map((slot) => (
          <article key={slot} className="sdm-pop">
            <Skel tone="ink" width="8.8rem" height="1rem" />
            <div className="sdm-pop-metrics">
              <Skel tone="light" width="2.8rem" height="1.05rem" />
              <Skel tone="ink" width="4.6rem" height="1.05rem" />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
