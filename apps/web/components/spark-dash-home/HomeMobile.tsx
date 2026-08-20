import Link from "next/link";
import { SD_ASSETS } from "./assets";
import { moneyOrDash, splitUsdtParts } from "./format";
import type {
  SparkDashHomeModel,
  SparkDashNavItem,
  SparkDashPopular,
  SparkDashStat,
  SparkDashWalletRow,
} from "./types";
import "./spark-dash-mobile.css";

const MOBILE_NAV: {
  key: "home" | "explore" | "assets" | "alerts" | "more";
  label: string;
  hrefKey?: SparkDashNavItem["key"];
  hrefFallback: string;
  icon: "home" | "explore" | "wallet" | "bell" | "more";
}[] = [
  { key: "home", label: "홈", hrefKey: "home", hrefFallback: "/", icon: "home" },
  {
    key: "explore",
    label: "기회 탐색",
    hrefKey: "explore",
    hrefFallback: "/profits",
    icon: "explore",
  },
  {
    key: "assets",
    label: "내 자산",
    hrefKey: "assets",
    hrefFallback: "/wallet",
    icon: "wallet",
  },
  {
    key: "alerts",
    label: "알림",
    hrefKey: "alerts",
    hrefFallback: "/me/inbox",
    icon: "bell",
  },
  { key: "more", label: "더보기", hrefFallback: "/me", icon: "more" },
];

const QUICK_ACTIONS = [
  { label: "기회 탐색", href: "/profits", icon: "explore" as const },
  { label: "내 자산", href: "/wallet", icon: "wallet" as const },
  { label: "참여 내역", href: "/trades", icon: "list" as const },
  { label: "정산 내역", href: "/wallet/history", icon: "receipt" as const },
];

function navHref(
  model: SparkDashHomeModel,
  hrefKey: SparkDashNavItem["key"] | undefined,
  fallback: string,
) {
  if (!hrefKey) return fallback;
  return model.nav.find((item) => item.key === hrefKey)?.href ?? fallback;
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
    <p className={`sdm-money${className ? ` ${className}` : ""}`}>
      <span className="sdm-money-amt">{parts.amount}</span>
      {unit ? <span className="sdm-money-unit">{` ${unit}`}</span> : null}
    </p>
  );
}

function PartnerName({
  kind,
  name,
  surface,
}: {
  kind: SparkDashPopular["partnerKind"];
  name: string;
  surface: "hero" | "card";
}) {
  return (
    <span
      className={`sdm-partner${surface === "card" ? " is-card" : ""}${kind === "yahoo" ? " is-yahoo" : ""}`}
    >
      {name}
    </span>
  );
}

function NativeGlyph({ kind }: { kind: "list" | "receipt" }) {
  return (
    <span className={`sdm-native-ico ${kind}`} aria-hidden>
      <span className="tab" />
      <span className="body" />
      {kind === "receipt" ? <span className="chk" /> : null}
    </span>
  );
}

function QuickIcon({ icon }: { icon: (typeof QUICK_ACTIONS)[number]["icon"] }) {
  if (icon === "explore") {
    return <img src={SD_ASSETS.mobileExplore} alt="" width={22} height={22} />;
  }
  if (icon === "wallet") {
    return <img src={SD_ASSETS.mobileWallet} alt="" width={22} height={22} />;
  }
  return <NativeGlyph kind={icon} />;
}

function StatGlyph({ kind }: { kind: SparkDashStat["key"] }) {
  if (kind === "active") {
    return <img src={SD_ASSETS.mobileIconLightning} alt="" width={16} height={16} />;
  }
  if (kind === "pending") {
    return <img src={SD_ASSETS.mobileIconClock} alt="" width={16} height={16} />;
  }
  if (kind === "month") {
    return <img src={SD_ASSETS.mobileIconTrend} alt="" width={16} height={16} />;
  }
  return <img src={SD_ASSETS.mobileIconTrophy} alt="" width={16} height={16} />;
}

function BucketAmt({ row }: { row: SparkDashWalletRow }) {
  const missing = row.usdt == null;
  const amount = missing ? "—" : splitUsdtParts(row.usdt).amount;
  return (
    <>
      <p className={`sdm-bucket-amt tone-${row.tone}${missing ? " is-empty" : ""}`}>
        {amount}
      </p>
      <p className="sdm-bucket-unit">USDT</p>
    </>
  );
}

function NavIcon({ icon, active }: { icon: (typeof MOBILE_NAV)[number]["icon"]; active: boolean }) {
  if (icon === "more") {
    return (
      <span className={`sdm-more-dots${active ? " is-active" : ""}`} aria-hidden>
        •••
      </span>
    );
  }
  const src =
    icon === "home"
      ? SD_ASSETS.mobileNavHome
      : icon === "explore"
        ? SD_ASSETS.mobileNavExplore
        : icon === "wallet"
          ? SD_ASSETS.mobileNavWallet
          : SD_ASSETS.mobileNavBell;
  return (
    <span className={`sdm-nav-ico${active ? " is-active" : ""}`} aria-hidden>
      <img src={src} alt="" width={20} height={20} />
    </span>
  );
}

export function HomeMobile({
  model,
  activeNav = "home",
}: {
  model: SparkDashHomeModel;
  activeNav?: "home" | "explore" | "assets" | "alerts" | "more";
}) {
  const hero = model.hero;
  const greetName = model.displayName ?? "회원님";
  const productSrc =
    hero?.productMediaUrl ??
    (model.owner === "visual_fixture" ? SD_ASSETS.productSneaker : null);

  return (
    <div className="sdm-root" data-owner={model.owner} data-name="Home / Mobile / Spark Dash">
      <header className="sdm-header">
        <div className="sdm-brand">
          <p className="sdm-wordmark">퍼뜩</p>
          <img className="sdm-brand-spark" src={SD_ASSETS.mobileBrandSpark} alt="" width={14} height={26} />
        </div>
        <Link className="sdm-bell" href="/me/inbox" aria-label="알림">
          <img src={SD_ASSETS.mobileBell} alt="" width={22} height={22} />
        </Link>
      </header>

      <div className="sdm-scroll">
        <div className="sdm-stack">
          <div className="sdm-strip">
            <span className="sdm-strip-spark" aria-hidden>
              ↯
            </span>
            <p>새로운 글로벌 기회가 업데이트됐어요</p>
          </div>

          <section className="sdm-greet">
            <p className="sdm-greet-hello">안녕하세요, {greetName}! 👋</p>
            <h1 className="sdm-greet-title">
              지금, 딱 맞는 기회가
              <br />
              당신을 기다리고 있어요!
            </h1>
            <span className="sdm-greet-bolt" aria-hidden>
              <img src={SD_ASSETS.mobileHeroLightning} alt="" width={58} height={88} />
            </span>
          </section>

          {hero ? (
            <section className="sdm-hero" data-sdm="hero">
              <div className="sdm-hero-top">
                <div className="sdm-hero-partner">
                  <PartnerName kind={hero.partnerKind} name={hero.partner} surface="hero" />
                  <span className="sdm-badge">공식 파트너</span>
                </div>
                <span className="sdm-ai-rec">AI 추천</span>
              </div>
              <h2 className="sdm-hero-title">{hero.title}</h2>
              <div
                className={`sdm-product${model.owner === "visual_fixture" ? " is-scene" : ""}`}
                data-sdm="product"
              >
                <span className="sdm-product-bloom" aria-hidden />
                {model.owner === "visual_fixture" ? (
                  <img
                    className="sdm-product-energy"
                    src={SD_ASSETS.mobileHeroEnergy}
                    alt=""
                  />
                ) : null}
                <span className="sdm-product-floor" aria-hidden />
                {productSrc ? (
                  <img className="sdm-product-shot" src={productSrc} alt={hero.productMediaAlt} />
                ) : (
                  <span className="sdm-product-empty">상품 이미지 준비 중</span>
                )}
              </div>
              <div className="sdm-metrics">
                <div className="sdm-metric">
                  <p className="k">예상 수익률</p>
                  <p className="v rate">{moneyOrDash(hero.ratePct)}</p>
                </div>
                <div className="sdm-metric profit">
                  <p className="k">예상 수익</p>
                  <MoneyLine value={hero.expectedProfitUsdt} className="v" />
                  {hero.expectedProfitKrw ? <p className="krw">{hero.expectedProfitKrw}</p> : null}
                </div>
                <div className="sdm-metric">
                  <p className="k">예상 소요 시간</p>
                  <p className="v">{moneyOrDash(hero.durationLabel)}</p>
                </div>
              </div>
              <div className="sdm-capital-row">
                <div className="sdm-capital">
                  <p className="k">최소 참여 원금</p>
                  <MoneyLine value={hero.capitalUsdt} withUnit className="v" />
                  {hero.capitalKrw ? <p className="krw">{hero.capitalKrw}</p> : null}
                </div>
                <span className="sdm-status">{hero.statusLabel}</span>
              </div>
              <Link className="sdm-cta" href={hero.participateHref} data-sdm="cta">
                지금 참여하기 →
              </Link>
            </section>
          ) : (
            <section className="sdm-hero is-empty" data-sdm="hero">
              <p className="sdm-hero-empty">지금 확인할 수 있는 기회가 아직 없어요.</p>
              <Link className="sdm-cta" href="/profits" data-sdm="cta">
                기회 살펴보기 →
              </Link>
            </section>
          )}

          <section className="sdm-wallet">
            <div className="sdm-wallet-top">
              <div>
                <p className="sdm-wallet-label">내 자산 현황</p>
                <MoneyLine value={model.walletHeadline.usdt} withUnit className="sdm-wallet-amt" />
                {model.walletHeadline.krw ? (
                  <p className="sdm-wallet-krw">{model.walletHeadline.krw}</p>
                ) : null}
              </div>
              <Link className="sdm-deposit" href="/wallet/deposit">
                입금하기
              </Link>
            </div>
            <div className="sdm-wallet-div" />
            <div className="sdm-buckets">
              {model.walletRows.map((row) => (
                <div key={row.key} className="sdm-bucket">
                  <p className="sdm-bucket-lab">{row.label}</p>
                  <BucketAmt row={row} />
                </div>
              ))}
            </div>
          </section>

          <nav className="sdm-quick" aria-label="바로가기">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} className="sdm-quick-item" href={action.href}>
                <QuickIcon icon={action.icon} />
                <span>{action.label}</span>
              </Link>
            ))}
          </nav>

          <Link className="sdm-ai" href="/me/peotteok" data-sdm="ai">
            <div className="sdm-ai-copy">
              <p className="title">퍼뜩 AI</p>
              <p className="body">지금 확인할 수 있는 기회를 정리하고 있어요.</p>
            </div>
            <span className="sdm-ai-visual" aria-hidden>
              <img className="sdm-ai-agent" src={SD_ASSETS.mobileAiAgent} alt="" width={64} height={64} />
              <img className="sdm-ai-eye is-l" src={SD_ASSETS.aiEyeRight} alt="" width={9} height={9} />
              <img className="sdm-ai-eye is-r" src={SD_ASSETS.aiEyeRight} alt="" width={9} height={9} />
            </span>
          </Link>

          <section className="sdm-summary">
            <h2 className="sdm-sec-title">내 현황 한눈에 보기</h2>
            <div className="sdm-summary-grid">
              {model.stats.map((stat) => (
                <article key={stat.key} className="sdm-stat">
                  <div className="sdm-stat-head">
                    <span className={`sdm-stat-ico ${stat.tone}`} data-stat-icon={stat.key}>
                      <StatGlyph kind={stat.key} />
                    </span>
                    <p className="lab">{stat.label}</p>
                  </div>
                  <MoneyLine value={stat.value} className="sdm-stat-val" />
                  <div className="sdm-stat-sub">
                    {stat.usdt ? <p className="u">{stat.usdt}</p> : null}
                    {stat.krw ? <p className="k">{stat.krw}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="sdm-pops">
            <div className="sdm-pops-head">
              <h2 className="sdm-sec-title">실시간 인기 기회</h2>
              <Link className="sdm-more" href="/profits">
                더보기 ›
              </Link>
            </div>
            {model.popular.length === 0 ? (
              <p className="sdm-pops-empty">지금 확인할 수 있는 기회가 아직 없어요.</p>
            ) : (
              model.popular.map((card) => (
                <Link key={card.id} href={card.href} className="sdm-pop">
                  <div className="sdm-pop-top">
                    <PartnerName kind={card.partnerKind} name={card.partner} surface="card" />
                    <span className="sdm-pop-official">공식 파트너</span>
                  </div>
                  <p className="sdm-pop-title">{card.title}</p>
                  <div className="sdm-pop-metrics">
                    <div>
                      <p className="k">예상 수익률</p>
                      <p className="rate">{moneyOrDash(card.ratePct)}</p>
                    </div>
                    <div>
                      <p className="k">예상 수익</p>
                      <MoneyLine value={card.expectedProfitUsdt} className="profit" />
                      {card.expectedProfitKrw ? <p className="krw">{card.expectedProfitKrw}</p> : null}
                    </div>
                  </div>
                  <div className="sdm-pop-foot">
                    <div>
                      <p className="k">예상 소요 시간</p>
                      <p className="v">{moneyOrDash(card.durationLabel)}</p>
                    </div>
                    <div>
                      <p className="k">최소 원금</p>
                      <MoneyLine value={card.capitalUsdt} className="v" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      </div>

      <nav className="sdm-nav" aria-label="하단 메뉴" data-sdm="nav">
        {MOBILE_NAV.map((item) => {
          const href = navHref(model, item.hrefKey, item.hrefFallback);
          const active = item.key === activeNav;
          return (
            <Link
              key={item.key}
              href={href}
              className={`sdm-nav-item${active ? " is-active" : ""}`}
            >
              <NavIcon icon={item.icon} active={active} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
