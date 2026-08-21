import { T } from "@aipo/ui/copy/ko";
import "./guest-first-visit.css";

/** Guest `/` 전용. /ads Landing3s·T.landing 광고 카피와 섞지 않는다. */
const HEADLINE_LINES = [
  "AI가 전 세계 시세를 맞춰요",
  "수익 기회까지 열어 드려요",
] as const;

const LEAD =
  "직접 찾아다니지 않아도 돼요. 같은 상품을 연결해 수익 기회를 보여 드려요.";

const DISCLAIMER = "기회와 결과는 시장 상황에 따라 달라질 수 있어요.";

const POINTS = [
  {
    title: "전 세계 시세",
    body: "여러 나라 가격을 한곳에서 보여 드려요.",
  },
  {
    title: "AI가 같은 상품을 맞춰요",
    body: "같은 물건인지 연결해 드려요.",
  },
  {
    title: "수익 기회 확인",
    body: "필요한 금액과 기회를 분명히 보여 드려요.",
  },
] as const;

function BrandLockup() {
  return (
    <header className="gfv-brand">
      <p className="gfv-wordmark">
        {T.brand.consumer}
        <img src="/spark-dash/brand-spark.svg" alt="" />
      </p>
      <p className="gfv-tag">전 세계 기회</p>
    </header>
  );
}

/**
 * REL-105 게스트 앱 진입 화면.
 * HomeDesktop/HomeMobile geometry를 바꾸지 않는다.
 * /ads Landing3s가 아니다. 가입/로그인 진실 입구만 유지한다.
 */
export function GuestFirstVisit() {
  return (
    <div data-testid="guest-first-visit" className="gfv">
      <div className="gfv-atmosphere" aria-hidden>
        <span className="gfv-bloom gfv-bloom-a" />
        <span className="gfv-bloom gfv-bloom-b" />
      </div>
      <div className="gfv-stage">
        <BrandLockup />
        <div className="gfv-hero">
          <div className="gfv-copy">
            <h1 className="gfv-headline">
              {HEADLINE_LINES.map((line, index) => (
                <span key={line} className="gfv-headline-line">
                  {line}
                  {index === HEADLINE_LINES.length - 1 ? (
                    <img
                      className="gfv-headline-spark"
                      src="/spark-dash/headline-spark.svg"
                      alt=""
                    />
                  ) : null}
                </span>
              ))}
            </h1>
            <p className="gfv-lead">{LEAD}</p>
            <div className="gfv-actions">
              <a
                href="/auth/signup"
                data-testid="guest-cta-signup"
                className="gfv-cta-primary"
              >
                {T.landing.ctaJoin}
              </a>
              <a
                href="/auth/login"
                data-testid="guest-cta-login"
                className="gfv-cta-secondary"
              >
                {T.landing.ctaLogin}
              </a>
            </div>
          </div>
          <div className="gfv-art" aria-hidden>
            <img className="gfv-halo" src="/spark-dash/hero-halo.svg" alt="" />
            <img
              className="gfv-bolt"
              src="/spark-dash/hero-lightning-neon.svg"
              alt=""
            />
          </div>
        </div>
        <ol className="gfv-points">
          {POINTS.map((point, index) => (
            <li key={point.title} className="gfv-point">
              <p className="gfv-point-index">{String(index + 1).padStart(2, "0")}</p>
              <p className="gfv-point-title">{point.title}</p>
              <p className="gfv-point-body">{point.body}</p>
            </li>
          ))}
        </ol>
        <p className="gfv-disclaimer">{DISCLAIMER}</p>
        <footer className="gfv-foot">{T.legal.operator.footerLine}</footer>
      </div>
    </div>
  );
}

/** 명시적 비회원이 아니라 조회 실패일 때. GuestFirstVisit로 위장하지 않는다. */
export function HomeSessionUnavailable() {
  return (
    <div data-testid="home-session-unavailable" className="gfv gfv--plain">
      <div className="gfv-stage gfv-stage--narrow">
        <BrandLockup />
        <h1 className="gfv-headline">지금은 화면을 불러오지 못했어요</h1>
        <p className="gfv-lead">잠시 후 다시 시도해 주세요.</p>
        <div className="gfv-actions">
          <a href="/" className="gfv-cta-primary">
            다시 시도
          </a>
          <a href="/auth/login" className="gfv-cta-secondary">
            {T.landing.ctaLogin}
          </a>
        </div>
      </div>
    </div>
  );
}
