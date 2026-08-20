import Link from "next/link";
import { SD_ASSETS } from "./assets";
import { moneyOrDash, splitUsdtParts } from "./format";
import type {
  SparkDashHomeModel,
  SparkDashNavItem,
  SparkDashPopular,
  SparkDashStat,
} from "./types";
import "./spark-dash-home.css";

function EbayMark({ size }: { size: "hero" | "card" }) {
  return (
    <span className={size === "hero" ? "sd-ebay" : "sd-pop-partner"}>
      <span className="e">e</span>
      <span className="b">B</span>
      <span className="a">a</span>
      <span className="y">y</span>
    </span>
  );
}

function PartnerLabel({
  kind,
  name,
  size,
}: {
  kind: SparkDashPopular["partnerKind"];
  name: string;
  size: "hero" | "card";
}) {
  if (kind === "ebay") return <EbayMark size={size} />;
  if (size === "hero") return <span className="sd-partner-plain">{name}</span>;
  return (
    <span className={`sd-pop-partner${kind === "yahoo" ? " yahoo" : ""}`}>{name}</span>
  );
}

function navIcon(item: SparkDashNavItem) {
  if (item.icon === "home") return <img src={SD_ASSETS.iconHome} alt="" />;
  if (item.icon === "explore") return <img src={SD_ASSETS.iconExplore} alt="" />;
  if (item.icon === "wallet") return <img src={SD_ASSETS.iconWallet} alt="" />;
  if (item.icon === "partner") return <img src={SD_ASSETS.iconPartner} alt="" />;
  if (item.icon === "bell") return <img src={SD_ASSETS.iconBell} alt="" />;
  if (item.icon === "settings") return <img src={SD_ASSETS.iconSettings} alt="" />;
  return (
    <span className={`sd-nav-glyph ${item.icon}`} aria-hidden>
      {item.icon === "receipt" ? <span className="chk" /> : null}
    </span>
  );
}

function MoneyLine({
  value,
  withUnit,
  className,
}: {
  value: string | null;
  withUnit?: boolean;
  className?: string;
}) {
  const parts = splitUsdtParts(value);
  const unit = parts.unit ?? (withUnit && value ? "USDT" : null);
  return (
    <p className={`sd-money-line${className ? ` ${className}` : ""}`}>
      <span className="sd-money-amt">{parts.amount}</span>
      {unit ? <span className="sd-money-unit">{unit}</span> : null}
    </p>
  );
}

function KrwLine({ value }: { value: string | null }) {
  if (!value) return null;
  return <p className="sd-krw">{value}</p>;
}

function StatGlyph({ kind }: { kind: SparkDashStat["key"] }) {
  if (kind === "active") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M11.15 3.1 6.35 10.7h4.05l-1.15 6.2 5.15-8.55h-3.95l.7-5.25Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "pending") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="6.15" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 6.55v3.85l2.65 1.55"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "month") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M3.7 13.35 7.55 9.4l2.55 2.2 6.1-6.05"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.55 5.55h3.65v3.65"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.15 4.2h5.7v4.05c0 2.05-1.25 3.5-2.85 3.5s-2.85-1.45-2.85-3.5V4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.15 6.15H5.05c.1 1.85 1.15 3.05 2.25 3.3M12.85 6.15h2.1c-.1 1.85-1.15 3.05-2.25 3.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 11.75v2.05M7.7 16.05h4.6M8.45 13.8h3.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatIcon({ stat }: { stat: SparkDashStat }) {
  return (
    <span className={`sd-stat-ico ${stat.tone}`} data-stat-icon={stat.key} aria-hidden>
      <StatGlyph kind={stat.key} />
    </span>
  );
}

export function HomeDesktop({
  model,
  activeNav = "home",
}: {
  model: SparkDashHomeModel;
  activeNav?: SparkDashNavItem["key"];
}) {
  const hero = model.hero;
  const productSrc =
    hero?.productMediaUrl ??
    (model.owner === "visual_fixture" ? SD_ASSETS.productSneaker : null);

  return (
    <div
      className="sd-root"
      data-owner={model.owner}
      data-name="Home / Desktop / Spark Dash"
    >
      <aside className="sd-sidebar">
        <div className="sd-sidebar-top">
          <div className="sd-brand">
            <p className="sd-wordmark">퍼뜩</p>
            <img className="sd-brand-spark" src={SD_ASSETS.brandSpark} alt="" />
          </div>
          <p className="sd-tagline">Global Opportunity Platform</p>
          <p className="sd-primary-label">PRIMARY</p>
          <nav className="sd-nav" aria-label="주요 메뉴">
            {model.nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`sd-nav-item${item.key === activeNav ? " is-active" : ""}`}
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
            <MoneyLine value={model.sidebarBalance.usdt} withUnit className="amt" />
            <KrwLine value={model.sidebarBalance.krw} />
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
              <p className="msg">새로운 글로벌 기회가 업데이트됐어요</p>
              <Link className="sd-strip-link" href="/profits">
                전체 기회 보기 ›
              </Link>
            </div>
            <div className="sd-header-right">
              <Link className="sd-header-bell" href="/me/inbox" aria-label="알림">
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
                  <p className="sd-user">{model.displayName ?? "회원님"}</p>
                  <p className="sd-level">{model.levelLabel ?? "—"}</p>
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
              <p className="sd-eyebrow">AI가 엄선한 오늘의 TOP 기회</p>
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
            {hero ? (
              <div className="sd-hero-left">
                <div className="sd-partner">
                  <PartnerLabel kind={hero.partnerKind} name={hero.partner} size="hero" />
                  <span className="sd-badge">공식 파트너</span>
                </div>
                <h2 className="sd-hero-title">{hero.title}</h2>
                <div className="sd-metrics">
                  <div className="sd-metric">
                    <p className="k">예상 수익률</p>
                    <p className="v rate">{moneyOrDash(hero.ratePct)}</p>
                  </div>
                  <span className="sd-metric-div" />
                  <div className="sd-metric profit">
                    <p className="k">예상 수익</p>
                    <MoneyLine value={hero.expectedProfitUsdt} className="v" />
                    <KrwLine value={hero.expectedProfitKrw} />
                  </div>
                  <span className="sd-metric-div" />
                  <div className="sd-metric dur">
                    <p className="k">예상 소요 시간</p>
                    <p className="v">{moneyOrDash(hero.durationLabel)}</p>
                  </div>
                </div>
                <div className="sd-capital">
                  <p className="k">최소 참여 원금</p>
                  <MoneyLine value={hero.capitalUsdt} withUnit className="v" />
                  <KrwLine value={hero.capitalKrw} />
                </div>
                <div className="sd-status">
                  <span className="sd-status-pill">{hero.statusLabel}</span>
                  <p className="sd-status-copy">{hero.statusCopy}</p>
                </div>
              </div>
            ) : (
              <p className="sd-hero-empty">지금 확인할 수 있는 기회가 아직 없어요.</p>
            )}
            <div className="sd-product">
              <span className="sd-product-energy" />
              <span className="sd-product-contact" />
              {productSrc ? (
                <img
                  className="sd-product-shot"
                  src={productSrc}
                  alt={hero?.productMediaAlt ?? "상품"}
                />
              ) : null}
              {hero ? <span className="sd-ai-rec">AI 추천</span> : null}
            </div>
            <aside className="sd-wallet">
              <p className="title">내 참여 가능 금액</p>
              <MoneyLine value={model.walletHeadline.usdt} withUnit className="amt" />
              <KrwLine value={model.walletHeadline.krw} />
              <div className="sd-wrows">
                {model.walletRows.map((row) => (
                  <div key={row.key} className={`sd-wrow ${row.tone}`}>
                    <span className={`dot ${row.tone}`} />
                    <span className="lab">{row.label}</span>
                    <div className="vals">
                      <MoneyLine value={row.usdt} className="u" />
                      <KrwLine value={row.krw} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="sd-wallet-cta">
                <Link className="sd-cta-primary" href={hero?.participateHref ?? "/profits"}>
                  지금 참여하기 →
                </Link>
                <Link className="sd-cta-secondary" href={hero?.detailHref ?? "/profits"}>
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
                    <StatIcon stat={stat} />
                    <p className="lab">{stat.label}</p>
                  </div>
                  <MoneyLine value={stat.value} className="val" />
                  {stat.usdt ? <p className="sub">{stat.usdt}</p> : null}
                  <KrwLine value={stat.krw} />
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
              {model.popular.map((card) => (
                <Link key={card.id} href={card.href} className="sd-pop">
                  <div className="sd-pop-head">
                    <PartnerLabel kind={card.partnerKind} name={card.partner} size="card" />
                    <span className="sd-pop-official">공식 파트너</span>
                  </div>
                  <p className="sd-pop-title">{card.title}</p>
                  <div className="sd-pop-highlight">
                    <div className="sd-pop-rate">
                      <p className="k">예상 수익률</p>
                      <p className="rate">{moneyOrDash(card.ratePct)}</p>
                    </div>
                    <div className="sd-pop-profit">
                      <p className="k">예상 수익</p>
                      <MoneyLine value={card.expectedProfitUsdt} className="profit" />
                      <KrwLine value={card.expectedProfitKrw} />
                    </div>
                  </div>
                  <div className="sd-pop-duration">
                    <p className="k">예상 소요 시간</p>
                    <p className="v">{moneyOrDash(card.durationLabel)}</p>
                  </div>
                  <div className="sd-pop-capital">
                    <p className="k">최소 원금</p>
                    <MoneyLine value={card.capitalUsdt} className="v" />
                    <KrwLine value={card.capitalKrw} />
                  </div>
                  <p className="sd-pop-status">
                    <span className="dot" />
                    {card.statusLabel}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
